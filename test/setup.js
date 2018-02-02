const nock = require('nock');

const Playlist = require('../src/models/playlist');
const Track = require('../src/models/track');
const User = require('../src/models/user');
const permissionWrapper = require('../src/slash_commands/permission_wrapper');

async function setDefaultUsers(callback) {
  await User.remove({});
  const user = new User({
    slackID: 'U1AAAAAAA',
    spotifyAccessToken: 'myAccessToken',
    spotifyRefreshToken: 'myRefreshToken',
    spotifyTokenExpiry: '2049-01-01',
    active: true
  });
  return user.save(callback);
}

beforeEach(async function () {
  nock.cleanAll();
  permissionWrapper.setOn();
  await setDefaultUsers();
  await Playlist.remove({});
  await Track.remove({});
});
