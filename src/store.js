const storage = require('node-persist');
const storageDir = process.env.STORAGE_DIR;
const storageOptions = storageDir ? { dir: storageDir } : {};
storage.initSync(storageOptions);

module.exports = {
  getPlaylists() {
    return storage.getItemSync('playlists') || {};
  },

  setPlaylists(playlists) {
    return storage.setItemSync('playlists', playlists);
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

  setUsers(users) {
    return storage.setItemSync('users', users);
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

