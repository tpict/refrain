const Playlist = require('../models/playlist');
const utils = require('../utils');

async function removePlaylist(payload, res) {
  const spotifyID = payload.actions[0].value;
  const playlist = await Playlist.findOne({ spotifyID });
  await playlist.remove({});
  res.send(`Removed configuration for *${playlist.name}*.`);
}

async function playPlaylist(payload, res) {
  const spotifyID = payload.actions[0].value;
  const playlist = await Playlist.findOne({ spotifyID });

  const spotifyApi = await utils.getSpotifyApi();
  spotifyApi
    .play({
      context_uri: playlist.uri
    })
    .then(
      async () => {
        await playlist.setActive();

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

module.exports = function list_playlists(payload, res) {
  const action = payload.actions[0];

  if (action.name === 'remove') {
    removePlaylist(payload, res);
  } else {
    playPlaylist(payload, res);
  }
};
