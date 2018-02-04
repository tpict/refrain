const User = require('../models/user');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function findme(req) {
  const searchTerms = req.body.text;
  if (!searchTerms) {
    return utils.slackAt(req, 'Please provide a search query.');
  }

  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  try {
    const data = await spotifyApi.searchTracks(searchTerms, { limit: 3 });
    return {
        text: `You searched for "${searchTerms}":`,
        attachments: utils.getSearchAttachments(searchTerms, data)
    };
  } catch (err) {
    logger.error(`Error performing track search: ${err.stack}`);
    throw err;
  }
};
