const store = require('../store');
const utils = require('../utils');

module.exports = function whichplaylist(req, res) {
  const activePlaylist = store.getActivePlaylist();

  if (activePlaylist) {
    utils.respond(
      req,
      res,
      `The active playlist is *${activePlaylist.name}*. If that's not what you're hearing, you'll have to select it from Spotify yourself.`
    );
  } else {
    utils.respond(req, res, 'There is no active playlist!', req);
  }
};
