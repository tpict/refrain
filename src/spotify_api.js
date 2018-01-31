const { URL } = require('url');
const SpotifyWebApi = require('spotify-web-api-node');
const AuthenticationRequest = require('../node_modules/spotify-web-api-node/src/authentication-request');
const WebApiRequest = require('../node_modules/spotify-web-api-node/src/webapi-request');
const HttpManager = require('../node_modules/spotify-web-api-node/src/http-manager');

const Track = require('./models/track');

function splitPlaylistURI(uri) {
  const splitURI = uri.split(':');
  return { userID: splitURI[2], playlistID: splitURI[4] };
}

// Find the index of the given track in the given playlist.
// This is a work-around for a bug in the Spotify API that prevents specifying
// a playlist offset by URI.
// https://github.com/spotify/web-api/issues/630
SpotifyWebApi.prototype.getPlaylistOffset = async function (playlist, track) {
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
      data => [data.body.items, data.body.total, data.body.next],
      err => console.error(err)
    );

    if (nextURL) {
      const searchParams = new URL(nextURL).searchParams;
      next.offset = searchParams.get('offset');
      next.limit = searchParams.get('limit');
    }

    tracks.some(item => {
      if (item.track.id === track.id) {
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
SpotifyWebApi.prototype.addAndStoreTrack = async function (
  trackData,
  playlist,
  userID
) {
  return this.addTracksToPlaylist(playlist.spotifyUserID, playlist.spotifyID, [
    trackData.uri
  ]).then(() => {
    const track = new Track({
      spotifyID: trackData.id,
      requestedBy: userID,
      artist: trackData.artists[0].name,
      title: trackData.name
    });
    return track.save();
  }).then(async track => {
    playlist.tracks.push(track._id);
    await playlist.save();
    return track;
  });
};

module.exports = SpotifyWebApi;
