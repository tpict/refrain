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

async function setDefaultPlaylists() {
  await Playlist.remove({});
  await Track.remove({});

  const track = new Track({
    spotifyID: '0eGsygTp906u18L0Oimnem',
    requestedBy: 'U1AAAAAAA',
    artist: 'The Killers',
    title: 'Mr. Brightside'
  });
  await track.save();

  const track2 = new Track({
    spotifyID: '2x9SpqnPi8rlE9pjHBwmSC',
    requestedBy: 'U1AAAAAAA',
    artist: 'Talking Heads',
    title: 'Psycho Killer - 2005 Remastered Version'
  });
  await track2.save();

  await Playlist.remove({});
  const playlist = new Playlist({
    spotifyID: 'P000000000000000000000',
    spotifyUserID: 'U1AAAAAAA',
    tracks: [track._id, track2._id],
    name: 'My playlist',
    active: true
  });
  return playlist.save();
}

beforeEach(async function () {
  nock.cleanAll();
  permissionWrapper.setOn();
  await setDefaultUsers();
  await setDefaultPlaylists();
});

afterEach(async function () {
  await User.remove({});
  await Playlist.remove({});
});
