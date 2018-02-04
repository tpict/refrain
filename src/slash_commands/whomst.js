const User = require('../models/user');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function whomst(req) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  let track = null;

  try {
    track = await spotifyApi.refrain.getMyCurrentPlayingTrack();
  } catch (err) {
    logger.error('Error getting current track for /whomst: ' + err);
    throw err;
  }

  if (!track) {
    return utils.slackAt(
      req,
      'Are you hearing things? If so, check that `/whichuser` matches the user signed in to Spotify.'
    );
  }

  if (track.isNew) {
    return utils.slackAt(
      req,
      `${track.formattedTitle} was added directly through Spotify :thumbsdown:`
    );
  }

  return utils.slackAt(
    req,
    `${track.formattedTitle} was last requested by <@${track.requestedBy}>`
  );
};
