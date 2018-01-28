const Playlist = require('../models/playlist');
const utils = require('../utils');

module.exports = async function whichplaylist(req, res) {
  const activePlaylist = await Playlist.getActive();

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
