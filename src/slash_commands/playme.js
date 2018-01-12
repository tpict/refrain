const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');

module.exports = wrapper(async function playme(req, res) {
  const spotifyApi = await utils.getSpotifyApi();
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
