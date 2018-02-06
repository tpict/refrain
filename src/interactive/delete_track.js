const User = require('../models/user');
const Playlist = require('../models/playlist');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function delete_track(payload) {
  const action = payload.actions[0];

  if (action.name === 'cancel') {
    return { text: 'Crisis averted.' };
  }

  let playlist;
  let track;
  let spotifyApi;

  await Promise.all([
    new Promise(async resolve => {
      playlist = await Playlist.getActive();
      await playlist
        .populate({ path: 'tracks', match: { spotifyID: action.value } })
        .execPopulate();
      track = playlist.tracks[0];
      resolve();
    }),
    new Promise(async resolve => {
      const activeUser = await User.getActive();
      spotifyApi = await activeUser.getSpotifyApi();
      resolve();
    })
  ]);

  try {
    spotifyApi.removeTracksFromPlaylist(
      playlist.spotifyUserID,
      playlist.spotifyID,
      [{ uri: track.uri }]
    );
  } catch (err) {
    logger.error(
      'Error deleting tracks for /interactive delete: ' + (err.stack || err)
    );
    throw err;
  }

  spotifyApi.skipToNext().catch(err => {
    logger.error(
      'Error starting next track for /interactive delete: ' + (err.stack || err)
    );
    throw err;
  });

  return utils.slackAt(
    payload.user.id,
    `That bad? Let's not listen to ${track.formattedTitle} again. :bomb:`
  );
};
