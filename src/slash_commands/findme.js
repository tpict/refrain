const User = require('../models/user');
const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');

module.exports = wrapper(async function findme(req, res) {
  const searchTerms = req.body.text;
  if (!searchTerms) {
    utils.respond(req, res, 'Please provide a search query.');
    return;
  }

  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  spotifyApi.searchTracks(searchTerms, { limit: 3 }).then(
    data => {
      res.send({
        text: `You searched for "${searchTerms}":`,
        attachments: utils.getSearchAttachments(searchTerms, data)
      });
    },
    err =>
    utils.errorWrapper(err, errorMessage =>
      utils.respond(
        req,
        res,
        errorMessage || 'An error occured while performing the search.'
      )
    )
  );
});
