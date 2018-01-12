const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');

module.exports = wrapper(async function pauseme(req, res) {
  const spotifyApi = await utils.getSpotifyApi();
  spotifyApi
    .pause()
    .then(
      () => utils.respond(req, res, 'Paused!'),
      err =>
        utils.errorWrapper(err, errorMessage =>
          utils.respond(req, res, errorMessage || 'Couldn\'t pause!')
        )
    );
});
