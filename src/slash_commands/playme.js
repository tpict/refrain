const User = require('../models/user');
const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');

module.exports = wrapper(async function playme(req, res) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  spotifyApi
    .play()
    .then(
      () => utils.respond(req, res, 'Now playing!'),
      err =>
        utils.errorWrapper(err, errorMessage =>
          utils.respond(req, res, errorMessage || 'Couldn\'t resume music!')
        )
    );
});
