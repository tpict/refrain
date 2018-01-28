const storage = require('node-persist');
const storageDir = process.env.STORAGE_DIR;
const storageOptions = storageDir ? { dir: storageDir } : {};
storage.initSync(storageOptions);

module.exports = {
  getUsers() {
    return storage.getItemSync('users') || {};
  },

  setUsers(users) {
    return storage.setItemSync('users', users);
  },

  setUser(userName, data) {
    const users = this.getUsers();
    users[userName] = data;
    return this.setUsers(users);
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

