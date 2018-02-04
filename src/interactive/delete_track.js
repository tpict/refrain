const User = require('../models/user');
const Playlist = require('../models/playlist');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function delete_track(payload) {
  const action = payload.actions[0];

  if (action.name === 'cancel') {
    return { text: 'Crisis averted.' };
  }

  const track = JSON.parse(action.value);
  const formattedSong = utils.formatSong(track.name, track.artist);
  const playlist = await Playlist.getActive();
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  try {
    spotifyApi.removeTracksFromPlaylist(
      playlist.spotifyUserID,
      playlist.spotifyID,
      [{ uri: track.uri }]
    );
  } catch (err) {
    logger.error('Error deleting tracks for /interactive delete: ' + err.stack);
    throw err;
  }

  spotifyApi.skipToNext().catch(err => {
    logger.error(
      'Error starting next track for /interactive delete: ' + err.stack
    );
    throw err;
  });

  return utils.slackAt(
    payload.user.id,
    `That bad? Let's not listen to ${formattedSong} again. :bomb:`
  );
};
