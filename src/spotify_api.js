const { URL } = require('url');
const SpotifyWebApi = require('spotify-web-api-node');

function splitPlaylistURI(uri) {
  const splitURI = uri.split(':');
  return { userID: splitURI[2], playlistID: splitURI[4] };
}

// Find the index of the given track in the given playlist.
// This is a work-around for a bug in the Spotify API that prevents specifying
// a playlist offset by URI.
// https://github.com/spotify/web-api/issues/630
SpotifyWebApi.prototype.getPlaylistOffset = async function (track, playlist) {
  const { userID, playlistID } = splitPlaylistURI(playlist.uri);

  let next = {};
  let nextURL = true;
  let found = false;

  let index = 0;
  let total = 0;

  while (nextURL && !found) {
    let tracks;
    [tracks, total, nextURL] = await this.getPlaylistTracks(
      userID,
      playlistID,
      next
    ).then(
      data => [data.body.items, data.body.total, data.body.next]
    );

    if (nextURL) {
      const searchParams = new URL(nextURL).searchParams;
      next.offset = searchParams.get('offset');
      next.limit = searchParams.get('limit');
    }

    tracks.some(item => {
      if (item.track.id === track.spotifyID) {
        found = true;
        return true;
      }

      index++;
      return false;
    });
  }

  return [index, total, found];
};

// Add a track to the given playlist and store it in the database.
SpotifyWebApi.prototype.addAndStoreTrack = async function (track, playlist) {
  return this.addTracksToPlaylist(playlist.spotifyUserID, playlist.spotifyID, [
    track.uri
  ])
    .then(() => {
      return track.save();
    })
    .then(async track => {
      playlist.tracks.push(track._id);
      await playlist.save();
      return track;
    });
};

// Play a track in the context of a playlist.
SpotifyWebApi.prototype.playTrackInPlaylistContext = async function (track, playlist) {
  const [offset, total, found] = await this.getPlaylistOffset(
    track,
    playlist
  );

  if (found) {
    await this.play({
      context_uri: playlist.uri,
      offset: { position: offset }
    });
  }

  return [found, total];
};

// Play a track in the context of a playlist, adding it to the playlist and
// and database if it's new.
SpotifyWebApi.prototype.playAndAddTrack = async function (track, playlist) {
  const [found, total] = await this.playTrackInPlaylistContext(
    track,
    playlist
  );

  if (found) {
    return;
  }

  await this.addAndStoreTrack(track, playlist);
  return this.play({ context_uri: playlist.uri, offset: { position: total } });
};

module.exports = SpotifyWebApi;
