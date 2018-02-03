const utils = require('../utils');

let on = true;

module.exports = {
  wrapper(callback) {
    return async req => {
      if (!on) {
        return utils.slackAt(req, 'The jukebox is off!', req);
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
