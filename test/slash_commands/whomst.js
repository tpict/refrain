require('../setup');

const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const permissionWrapper = require('../../src/slash_commands/permission_wrapper');
const Playlist = require('../../src/models/playlist');
const Track = require('../../src/models/track');

chai.use(chaiHttp);

describe('/whomst endpoint', async function () {
  beforeEach(async function () {
    const track = new Track({
      spotifyID: '0eGsygTp906u18L0Oimnem',
      requestedBy: 'U1AAAAAAA',
      artist: 'The Killers',
      name: 'Mr. Brightside'
    });
    await track.save();

    const track2 = new Track({
      spotifyID: '2x9SpqnPi8rlE9pjHBwmSC',
      requestedBy: 'U1AAAAAAA',
      artist: 'Talking Heads',
      name: 'Psycho Killer - 2005 Remastered Version'
    });
    await track2.save();

    const playlist = new Playlist({
      spotifyID: 'P000000000000000000000',
      spotifyUserID: 'U1AAAAAAA',
      tracks: [track._id, track2._id],
      name: 'My playlist',
      active: true
    });
    await playlist.save();
  });

  it('should track who requested a track', async function () {
    const scope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(200, require('../fixtures/currently_playing.json'));

    const body = utils.baseSlackRequest({
      command: '/whomst'
    });

    const res = await chai
      .request(app)
      .post('/whomst')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: *Mr. Brightside* by *The Killers* was last requested by <@U1AAAAAAA>'
    );

    scope.done();
  });

  it('should tell the user if the track was added directly', async function () {
    const scope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(200, require('../fixtures/currently_playing_2.json'));

    const body = utils.baseSlackRequest({
      command: '/whomst'
    });

    const res = await chai
      .request(app)
      .post('/whomst')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: *Psycho Killer - 2005 Remastered Version* by *Talking Heads* was added directly through Spotify :thumbsdown:'
    );

    scope.done();
  });

  it('should tell the user if no track is playing', async function () {
    const scope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(204);

    const body = utils.baseSlackRequest({
      command: '/whomst'
    });

    const res = await chai
      .request(app)
      .post('/whomst')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: Are you hearing things? If so, check that `/whichuser` matches the user signed in to Spotify.'
    );

    scope.done();
  });

  it('should only work when the jukebox is on', async function () {
    permissionWrapper.setOff();

    const body = utils.baseSlackRequest({
      command: '/whomst'
    });

    const res = await chai
      .request(app)
      .post('/whomst')
      .send(body);

    chai.assert.equal(res.body.text, '<@U1AAAAAAA>: The jukebox is off!');
    chai.assert.equal(res.body.response_type, 'in_channel');
  });
});
