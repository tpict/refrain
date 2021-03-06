const User = require('../models/user');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function shuffle(req) {
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
      logger.error(`Error setting shuffle ${text}: ${err.stack || err}`);
      throw err;
    });
};
