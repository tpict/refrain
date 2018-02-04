const Playlist = require('../models/playlist');
const utils = require('../utils');

module.exports = async function whichplaylist(req) {
  const activePlaylist = await Playlist.getActive();
  return utils.slackAt(
    req,
    `The active playlist is *${
      activePlaylist.name
    }*. If that's not what you're hearing, you'll have to select it from Spotify yourself.`
  );
};
