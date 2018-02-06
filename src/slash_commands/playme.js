const User = require('../models/user');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function playme(req) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  try {
    await spotifyApi.play();
    return utils.slackAt(req, 'Now playing!');
  } catch (err) {
    logger.error('Error playing music for /playme: ' + (err.stack || err));
    throw err;
  }
};
