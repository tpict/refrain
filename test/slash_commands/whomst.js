const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const storage = require('node-persist');

const utils = require('../utils');

const app = require('../../src/app');
const permissionWrapper = require('../../src/slash_commands/permission_wrapper');
const store = require('../../src/store');

chai.use(chaiHttp);

describe('/whomst endpoint', function () {
  beforeEach(function () {
    utils.setDefaultUsers();

    store.setActivePlaylist('myplaylist');
    store.setPlaylists({
      myplaylist: {
        id: 'P000000000000000000000',
        user_id: 'U1AAAAAAA',
        tracks: {
          '0eGsygTp906u18L0Oimnem': {
            requester: 'bing.bong',
            artist: 'The Killers',
            name: 'Mr. Brightside'
          }
        },
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
        name: 'My playlist'
      }
    });
  });

  afterEach(function () {
    nock.cleanAll();
    permissionWrapper.setOn();
    storage.clearSync();
  });

  it('should track who requested a track', function (done) {
    const scope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(200, require('../fixtures/currently_playing.json'));

    const body = utils.baseSlackRequest({
      command: '/whomst'
    });

    chai
      .request(app)
      .post('/whomst')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: *Mr. Brightside* by *The Killers* was last requested by <@bing.bong>'
        );

        scope.done();
        done();
      });
  });

  it('should tell the user if the track was added directly', function (done) {
    const scope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(200, require('../fixtures/currently_playing_2.json'));

    const body = utils.baseSlackRequest({
      command: '/whomst'
    });

    chai
      .request(app)
      .post('/whomst')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: *Psycho Killer - 2005 Remastered Version* by *Talking Heads* was added directly through Spotify :thumbsdown:'
        );

        scope.done();
        done();
      });
  });

  it('should tell the user if no track is playing', function (done) {
    const scope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(204);

    const body = utils.baseSlackRequest({
      command: '/whomst'
    });

    chai
      .request(app)
      .post('/whomst')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: Are you hearing things? If so, check that `/whichuser` matches the user signed in to Spotify.'
        );

        scope.done();
        done();
      });
  });

  it('should only work when the jukebox is on', function (done) {
    permissionWrapper.setOff();

    const body = utils.baseSlackRequest({
      command: '/whomst'
    });

    chai
      .request(app)
      .post('/whomst')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: The jukebox is off!'
        );
        chai.assert.equal(res.body.response_type, 'in_channel');
        done();
      });
  });
});
