const User = require('../models/user');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function pauseme(req) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  try {
    await spotifyApi.pause();
    return utils.slackAt(req, 'Paused!');
  } catch (err) {
    logger.error('Error pausing for /pauseme: ' + err.stack);
    throw err;
  }
};
