const utils = require('../utils');
const logger = require('../logger');
const Playlist = require('../models/playlist');
const User = require('../models/user');

let on = true;

module.exports = {
  wrapper(callback, needsPower = false) {
    return async req => {
      if ((await User.count({})) === 0) {
        return utils.slackAt(
          req,
          'No users have been authenticated yet! Try `/spotifyauth` to register yourself.'
        );
      }

      if ((await Playlist.count({})) === 0) {
        return utils.slackAt(
          req,
          'There are no configured playlists. Try `/addplaylist` to get started.'
        );
      }

      if (!await Playlist.getActive()) {
        logger.error('No active playlist found. Please report this.');
        return utils.slackAt(
          req,
          'For some reason, there\'s no active playlist. Try starting one with `/listplaylists.`'
        );
      }

      if (needsPower && !on) {
        return utils.slackAt(req, 'The jukebox is off!');
      }

      return callback(req);
    };
  },

  setOn() {
    on = true;
  },

  setOff() {
    on = false;
  }
};
