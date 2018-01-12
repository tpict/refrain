const store = require('../store');
const utils = require('../utils');

module.exports = function removeplaylist(req, res) {
  const alias = req.body.text;
  if (!alias) {
    utils.respond(
      req,
      res,
      'Please specify the alias of the playlist you wish to remove.'
    );
    return;
  }

  const playlists = store.getPlaylists();
  const playlist = playlists[alias];

  if (!playlist) {
    utils.respond(
      req,
      res,
      'That doesn\'t look like a valid playlist alias! Try `/listplaylists`.'
    );
    return;
  }

  delete playlists[alias];
  store.setPlaylists(playlists);
  utils.respond(req, res, `Removed configuration for *${playlist.name}*.`);
};
