const User = require('../models/user');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function find_track_more(payload) {
  const action = payload.actions[0];
  const data = JSON.parse(action.value);

  const query = data.query;
  const options = {
    offset: data.offset,
    limit: data.limit
  };

  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  try {
    const data = await spotifyApi.searchTracks(query, options);
    return {
      text: `You searched for "${query}":`,
      attachments: utils.getSearchAttachments(query, data)
    };
  } catch (err) {
    logger.error(
      'Error searching tracks for /interactive find more: ' + (err.stack || err)
    );
    throw err;
  }
};
