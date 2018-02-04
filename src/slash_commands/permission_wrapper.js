const utils = require('../utils');
const logger = require('../logger');
const Playlist = require('../models/playlist');
const User = require('../models/user');

let on = true;

module.exports = {
  needsPower(req, res, next) {
    if (on) {
      next();
    } else {
      res.send(utils.slackAt(req, 'The jukebox is off!'));
    }
  },

  async needsActive(req, res, next) {
    const activeUser = await User.getActive();
    if (req.body.user_id === activeUser.slackID) {
      next();
    } else {
      res.send(utils.slackAt(req, 'Only the active user may do that.'));
    }
  },

  async needsSetup(req, res, next) {
    if ((await User.count({})) === 0) {
      return res.send(
        utils.slackAt(
          req,
          'No users have been authenticated yet! Try `/spotifyauth` to register yourself.'
        )
      );
    }

    if ((await Playlist.count({})) === 0) {
      return res.send(
        utils.slackAt(
          req,
          'There are no configured playlists. Try `/addplaylist` to get started.'
        )
      );
    }

    if (!await Playlist.getActive()) {
      logger.error('No active playlist found. Please report this.');
      return res.send(
        utils.slackAt(
          req,
          'For some reason, there\'s no active playlist. Try starting one with `/listplaylists.`'
        )
      );
    }

    next();
  },

  setOn() {
    on = true;
  },

  setOff() {
    on = false;
  }
};
