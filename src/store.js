const storage = require('node-persist');

module.exports = {
  getPlaylists() {
    return storage.getItemSync('playlists') || {};
  },

  getActivePlaylistAlias() {
    return storage.getItemSync('active_playlist');
  },

  setActivePlaylist(playlistAlias) {
    storage.setItemSync('active_playlist', playlistAlias);
  },

  getActivePlaylist() {
    return this.getPlaylists()[this.getActivePlaylistAlias()];
  },

  getUsers() {
    return storage.getItemSync('users') || {};
  },

  getActiveUser() {
    return this.getUsers()[this.getActiveUserName()];
  },

  getActiveUserName() {
    return storage.getItemSync('active_user');
  },

  getActiveUserID() {
    return this.getActiveUser().id;
  },

  setActiveUser(userName) {
    storage.setItemSync('active_user', userName);
  }
};

