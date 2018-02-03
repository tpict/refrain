const User = require('../models/user');
const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');
const logger = require('../logger');

module.exports = wrapper(async function playme(req) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  try {
    await spotifyApi.play();
    return utils.slackAt(req, 'Now playing!');
  } catch (err) {
    logger.error('Error playing music for /playme: ' + err);
    return err;
  }
});
