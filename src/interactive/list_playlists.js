const store = require('../store');
const utils = require('../utils');

function removePlaylist(payload, res) {
  const action = payload.actions[0];
  const playlists = store.getPlaylists();
  const playlist = playlists[action.value];
  delete playlists[action.value];
  store.setPlaylists(playlists);
  res.send(`Removed configuration for *${playlist.name}*.`);
}

async function playPlaylist(payload, res) {
  const action = payload.actions[0];
  const spotifyApi = await utils.getSpotifyApi();
  const playlist = store.getPlaylists()[action.value];

  spotifyApi
    .play({
      context_uri: playlist.uri
    })
    .then(
      () => {
        store.setActivePlaylist(action.value);

        res.send(
          `Now playing from *${playlist.name}*! Commands will now act on this playlist.`
        );
      },
      err =>
        utils.errorWrapper(err, errorMessage =>
          res.send(errorMessage || 'Looks like a misconfigured playlist.')
        )
    );
}

module.exports = async function list_playlists(payload, res) {
  const action = payload.actions[0];

  if (action.name === 'remove') {
    removePlaylist(payload, res);
  } else {
    playPlaylist(payload, res);
  }
};
