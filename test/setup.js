const User = require('../src/models/user');

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
  await setDefaultUsers();
});
