const storage = require('node-persist');

module.exports = {
  sleep(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
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
      console.error('app#directed should be supplied a request from Spotify');
      return;
    }

    const data = this.inChannel(rawData);
    const text = data.text;
    data.text = `<@${req.body.user_name}>: ${text}`;
    return data;
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

  getUserID() {
    return storage.getItemSync('user_id');
  },

  getPlaylists() {
    return storage.getItemSync('playlists') || {};
  },

  getUsers() {
    return storage.getItemSync('users') || {};
  },

  getStates() {
    return storage.getItemSync('states') || {};
  },

  getActivePlaylistID() {
    return storage.getItemSync('active_playlist');
  },

  getActivePlaylist() {
    return this.getPlaylists()[this.getActivePlaylistID()];
  },

  getActiveUser() {
    return storage.getItemSync('active_user');
  },

  setActiveUser(user) {
    storage.setItemSync('user', user);
  }
};
