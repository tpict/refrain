const User = require('../models/user');
const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');
const logger = require('../logger');

module.exports = wrapper(async function shuffle(req) {
  const text = req.body.text.toLowerCase();
  if (!['on', 'off'].includes(text)) {
    return utils.slackAt(req, 'Please specify `on` or `off`.');
  }

  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  const state = text === 'on';
  return spotifyApi
    .setShuffle({ state })
    .then(() => utils.slackAt(req, `Shuffle is now ${text}.`))
    .catch(err => {
      logger.error(`Error setting shuffle ${text}: ${err}`);
      throw err;
    });
});
