const { URL } = require('url');
const SpotifyWebApi = require('spotify-web-api-node');

const Playlist = require('./models/playlist');
const Track = require('./models/track');

function splitPlaylistURI(uri) {
  const splitURI = uri.split(':');
  return { userID: splitURI[2], playlistID: splitURI[4] };
}

const extended = api => ({
  // Find the index of the given track in the given playlist.
  // This is a work-around for a bug in the Spotify API that prevents specifying
  // a playlist offset by URI.
  // https://github.com/spotify/web-api/issues/630
  getPlaylistOffset: async (track, playlist) => {
    const { userID, playlistID } = splitPlaylistURI(playlist.uri);

    let next = {};
    let nextURL = true;
    let found = false;

    let index = 0;
    let total = 0;

    while (nextURL && !found) {
      let tracks;
      [tracks, total, nextURL] = await api.getPlaylistTracks(
        userID,
        playlistID,
        next
      ).then(data => [data.body.items, data.body.total, data.body.next]);

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
  },

  // Add a track to the given playlist and store it in the database.
  addAndStoreTrack: async (track, playlist) => {
    return api.addTracksToPlaylist(
      playlist.spotifyUserID,
      playlist.spotifyID,
      [track.uri]
    )
      .then(() => {
        return track.save();
      })
      .then(async track => {
        playlist.tracks.push(track._id);
        await playlist.save();
        return track;
      });
  },

  // Play a track in the context of a playlist.
  playTrackInPlaylistContext: async (track, playlist) => {
    const [offset, total, found] = await api.refrain.getPlaylistOffset(
      track,
      playlist
    );

    if (found) {
      await api.play({
        context_uri: playlist.uri,
        offset: { position: offset }
      });
    }

    return [found, total];
  },

  // Play a track in the context of a playlist, adding it to the playlist and
  // and database if it's new.
  playAndAddTrack: async (track, playlist) => {
    const [found, total] = await api.refrain.playTrackInPlaylistContext(
      track,
      playlist
    );

    if (found) {
      return;
    }

    await api.refrain.addAndStoreTrack(track, playlist);
    return api.play({
      context_uri: playlist.uri,
      offset: { position: total }
    });
  },

  // The following methods make the same requests as their vanilla
  // counterparts, but accept and return Mongoose models.

  // Returns null, the Track item in the database (uses active playlist
  // context) or a new Track.
  getMyCurrentPlayingTrack: async () => {
    const res = await api.getMyCurrentPlayingTrack();
    const trackData = res.body.item;

    if (!trackData) {
      return null;
    }

    const playlist = await Playlist.getActive();
    await playlist
      .populate({
        path: 'tracks',
        match: { spotifyID: trackData.id }
      })
      .execPopulate();

    if (playlist.tracks.length > 0) {
      return playlist.tracks[0];
    }

    return new Track({
      spotifyID: trackData.id,
      artist: trackData.artists[0].name,
      title: trackData.name
    });
  }
});

function ExtendedApi(credentials) {
  this._credentials = credentials || {};
  this.refrain = extended(this);
}

ExtendedApi.prototype = SpotifyWebApi.prototype;

module.exports = ExtendedApi;
