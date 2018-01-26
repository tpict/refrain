const utils = require('../utils');

module.exports = async function find_track_more(payload, res) {
  const action = payload.actions[0];
  const data = JSON.parse(action.value);

  const query = data.query;
  const options = {
    offset: data.offset,
    limit: data.limit
  };

  const spotifyApi = await utils.getSpotifyApi();
  spotifyApi.searchTracks(query, options).then(
    data => {
      res.send({
        text: `You searched for "${query}":`,
        attachments: utils.getSearchAttachments(query, data)
      });
    },
    err =>
      utils.errorWrapper(err, errorMessage =>
        res.send(
          errorMessage || 'An error occured while performing the search.'
        )
      )
  );
  return;
};
