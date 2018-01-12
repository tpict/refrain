const utils = require('../utils');

let on = true;

module.exports = {
  wrapper(callback) {
    return (req, res) => {
      if (!on) {
        utils.respond(req, res, 'The jukebox is off!', req);
        return;
      }

      callback(req, res);
    };
  },

  setOn() {
    on = true;
  },

  setOff() {
    on = false;
  }
};
