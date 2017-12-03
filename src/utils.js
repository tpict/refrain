const storage = require('node-persist');

module.exports = {
  sleep(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  },

  // Handle common HTTP error responses
  errorWrapper(err, req, res, callback) {
    console.error(err);

    if (err.statusCode === 500) {
      this.respond(
        req,
        res,
        'Spotify had an internal server error. Don\'t shoot the messenger!'
      );
      return;
    } else if (err.statusCode === 502) {
      this.respond(
        req,
        res,
        'The Spotify API is down. Don\'t shoot the messenger!'
      );
      return;
    }

    callback();
  },

  inChannel(data) {
    if (typeof data === 'string') {
      data = { text: data };
    }

    data.response_type = 'in_channel';
    return data;
  },

  directed(rawData, req) {
    if (!req) {
      console.error(
        'app#directed should be supplied either a request from Spotify or a username'
      );
      return;
    }

    const data = this.inChannel(rawData);
    const text = data.text;

    const userName = typeof req == 'string' ? req : req.body.user_name;

    data.text = `<@${userName}>: ${text}`;
    return data;
  },

  respond(req, res, message) {
    res.send(this.directed(message, req));
  },

  generateRandomString(length) {
    var text = '';
    var possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  },

  getPlaylists() {
    return storage.getItemSync('playlists') || {};
  },

  getStates() {
    return storage.getItemSync('states') || {};
  },

  getActivePlaylistAlias() {
    return storage.getItemSync('active_playlist');
  },

  getActivePlaylist() {
    return this.getPlaylists()[this.getActivePlaylistAlias()];
  },

  getUsers() {
    return storage.getItemSync('users') || {};
  },

  getActiveUserName() {
    return storage.getItemSync('active_user');
  },

  getActiveUser() {
    return this.getUsers()[this.getActiveUserName()];
  },

  setActiveUser(userName) {
    storage.setItemSync('active_user', userName);
  }
};
