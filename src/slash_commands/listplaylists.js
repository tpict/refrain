const store = require('../store');
const utils = require('../utils');

module.exports = async function listplaylists(req, res) {
  const playlists = store.getPlaylists();
  const aliases = Object.keys(playlists);

  if (aliases.length === 0) {
    utils.respond(
      req,
      res,
      'There are no configured playlists. Try `/addplaylist` to get started.'
    );
    return;
  }

  const spotifyApi = await utils.getSpotifyApi();

  const requests = aliases.map(alias =>
    spotifyApi
    .getPlaylist(playlists[alias].user_id, playlists[alias].id)
    .catch(err => err)
  );
  Promise.all(requests).then(
    values => {
      const lines = values.map((value, index) => {
        return `${aliases[index]}: ${value.body
            ? value.body.name
            : 'Misconfigured!'}`;
      });
      utils.respond(req, res, `\n${lines.join('\n')}`);
    },
    err =>
    utils.errorWrapper(err, errorMessage =>
      utils.respond(
        req,
        res,
        errorMessage || 'Looks like you have a misconfigured playlist.'
      )
    )
  );
};
