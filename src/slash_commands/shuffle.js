const User = require('../models/user');
const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');

module.exports = wrapper(async function shuffle(req, res) {
  const text = req.body.text;
  if (!['on', 'off'].includes(text)) {
    utils.respond(req, res, 'Please specify `on` or `off`.');
    return;
  }

  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  const state = text.toLowerCase() === 'on';
  spotifyApi
    .setShuffle({ state })
    .then(
      () => utils.respond(req, res, `Shuffle is now ${state ? 'on' : 'off'}.`),
      err =>
        utils.errorWrapper(err, errorMessage =>
          utils.respond(
            req,
            res,
            errorMessage || 'An error occurred while setting shuffle state.'
          )
        )
    );
});
