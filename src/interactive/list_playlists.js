const User = require('../models/user');
const Playlist = require('../models/playlist');
const logger = require('../logger');

async function removePlaylist(payload) {
  const spotifyID = payload.actions[0].value;
  const playlist = await Playlist.findOne({ spotifyID });

  try {
    await playlist.remove({});
    return `Removed configuration for *${playlist.name}*.`;
  } catch (err) {
    logger.error(
      'Error removing playlist for /interactive list playlists: ' +
        (err.stack || err)
    );
    throw err;
  }
}

async function playPlaylist(payload) {
  const spotifyID = payload.actions[0].value;
  const playlist = await Playlist.findOne({ spotifyID });

  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  try {
    await spotifyApi.play({
      context_uri: playlist.uri
    });
    await playlist.setActive();

    return `Now playing from *${
      playlist.name
    }*! Commands will now act on this playlist.`;
  } catch (err) {
    logger.error(
      'Error playing playlist for /interactive list playlists: ' +
        (err.stack || err)
    );
    throw err;
  }
}

module.exports = async function list_playlists(payload) {
  const action = payload.actions[0];

  if (action.name === 'remove') {
    return await removePlaylist(payload);
  } else {
    return await playPlaylist(payload);
  }
};
