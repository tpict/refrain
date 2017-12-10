const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const nock = require('nock');
const storage = require('node-persist');

process.env.NODE_ENV = 'test';
process.env.STORAGE_DIR = 'test-storage';

const { app, spotifyApi, webClient } = require('../src/app');
const store = require('../src/store');

const sandbox = sinon.sandbox.create();

chai.use(chaiHttp);
describe('Slack slash command endpoints', function () {
  function baseSlackRequest(fields = {}) {
    return Object.assign(
      {
        token: 'mYslacKTOkeN123456789000',
        team_id: 'T0AAAAAAA',
        team_domain: 'refrain',
        channel_id: 'D1AAAAAAA',
        channel_name: 'directmessage',
        user_id: 'U1AAAAAAA',
        user_name: 'bing.bong',
        command: '',
        text: '',
        response_url:
          'https://hooks.slack.com/commands/T0AAAAAAA/123456789000/AAAAAAAAAAAAAAAAAAAAAAAA',
        trigger_id: '123456789000.1234567890.abcdeff123aaa1111111111111111111'
      },
      fields
    );
  }

  afterEach(function () {
    nock.cleanAll();
    sandbox.restore();
    storage.clearSync();
  });

  describe('/shuffle endpoint', function () {
    it('should respond to "/shuffled on"', function (done) {
      const scope = nock('https://api.spotify.com')
        .put('/v1/me/player/shuffle')
        .query({
          state: true
        })
        .reply(200);

      const body = baseSlackRequest({
        command: '/shuffled',
        text: 'on'
      });

      chai
        .request(app)
        .post('/shuffle')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(res.body.text, '<@bing.bong>: Shuffle is now on.');
          chai.assert.equal(res.body.response_type, 'in_channel');
          scope.done();
          done();
        });
    });

    it('should respond to "/shuffled off"', function (done) {
      const scope = nock('https://api.spotify.com')
        .put('/v1/me/player/shuffle')
        .query({
          state: false
        })
        .reply(200);

      const body = baseSlackRequest({
        command: '/shuffled',
        text: 'off'
      });

      chai
        .request(app)
        .post('/shuffle')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(res.body.text, '<@bing.bong>: Shuffle is now off.');
          chai.assert.equal(res.body.response_type, 'in_channel');
          scope.done();
          done();
        });
    });

    it('should respond to invalid parameters', function (done) {
      const scope = nock('https://api.spotify.com')
        .put('/v1/me/player/shuffle')
        .query(true)
        .reply(200);

      const body = baseSlackRequest({
        command: '/shuffled',
        text: 'hello world'
      });

      chai
        .request(app)
        .post('/shuffle')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Please specify `on` or `off`.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');
          chai.assert.isFalse(scope.isDone());
          done();
        });
    });
  });

  describe('/commandeer endpoint', function () {
    let scope;

    beforeEach(function () {
      scope = nock('https://accounts.spotify.com')
        .post('/api/token')
        .reply(200, {
          access_token: 'theNewAccessToken',
          token_type: 'Bearer',
          scope: [
            'playlist-read-private',
            'playlist-read-collaborative',
            'playlist-modify-public',
            'playlist-modify-private',
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing'
          ].join(' '),
          expires_in: 3600
        });
    });

    it('should reject unauthenticated users', function (done) {
      sandbox.spy(spotifyApi, 'setRefreshToken');
      sandbox.spy(spotifyApi, 'setAccessToken');

      const body = baseSlackRequest({
        command: '/commandeer'
      });

      chai
        .request(app)
        .post('/commandeer')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: You\'re not authenticated with Spotify. Try `/spotifyauth` if you\'d like to get set up'
          );
          chai.assert.isTrue(spotifyApi.setRefreshToken.notCalled);
          chai.assert.isTrue(spotifyApi.setAccessToken.notCalled);
          chai.assert.isFalse(scope.isDone());
          done();
        });
    });

    it('should update Spotify tokens for the commandeering user', function (done) {
      sandbox.spy(spotifyApi, 'setRefreshToken');
      sandbox.spy(spotifyApi, 'setAccessToken');

      store.setUsers({
        'bing.bong': {
          id: 'myID',
          access_token: 'myAccessToken',
          refresh_token: 'myRefreshToken'
        }
      });

      const body = baseSlackRequest({
        command: '/commandeer'
      });

      chai
        .request(app)
        .post('/commandeer')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: You are now the active user!'
          );
          chai.assert.isTrue(spotifyApi.setRefreshToken.calledOnce);
          chai.assert.isTrue(spotifyApi.setAccessToken.calledTwice);
          scope.done();
          done();
        });
    });
  });

  describe('/whichuser endpoint', function () {
    it('should prompt new users to use /spotifyauth', function (done) {
      const body = baseSlackRequest({
        command: '/whichuser'
      });

      chai
        .request(app)
        .post('/whichuser')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: No authenticated users yet. Use `/spotifyauth` to get started.'
          );
          done();
        });
    });

    it('should return the active user', function (done) {
      store.setUsers({
        'bing.bong': {
          id: 'myID',
          access_token: 'myAccessToken',
          refresh_token: 'myRefreshToken'
        }
      });
      store.setActiveUser('bing.bong');

      const body = baseSlackRequest({
        command: '/whichuser'
      });

      chai
        .request(app)
        .post('/whichuser')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: The active user is <@bing.bong>'
          );
          done();
        });
    });
  });

  describe('/listusers endpoint', function () {
    it('should list authenticated users', function (done) {
      store.setUsers({
        'bing.bong': {
          id: 'myID',
          access_token: 'myAccessToken',
          refresh_token: 'myRefreshToken'
        },
        'another.user': {
          id: 'anotherID',
          access_token: 'anotherAccessToken',
          refresh_token: 'anotherRefreshToken'
        }
      });

      const body = baseSlackRequest({
        command: '/listusers'
      });

      chai
        .request(app)
        .post('/listusers')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Authenticated users:\nbing.bong\nanother.user'
          );
          done();
        });
    });

    it('should prompt use of /spotifyauth in new workspaces', function (done) {
      const body = baseSlackRequest({
        command: '/listusers'
      });

      chai
        .request(app)
        .post('/listusers')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: No users have been authenticated yet! Try `/spotifyauth` to register yourself.'
          );
          done();
        });
    });
  });

  describe('/playme endpoint', function () {
    it('should begin music playback', function (done) {
      const scope = nock('https://api.spotify.com')
        .put('/v1/me/player/play')
        .reply(200);

      const body = baseSlackRequest({
        command: '/playme'
      });

      chai
        .request(app)
        .post('/playme')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(res.body.text, '<@bing.bong>: Now playing!');
          chai.assert.equal(res.body.response_type, 'in_channel');
          scope.done();
          done();
        });
    });

    it('should prompt users to use /findme', function (done) {
      const scope = nock('https://api.spotify.com')
        .put('/v1/me/player/play')
        .reply(200);

      const body = baseSlackRequest({
        command: '/playme',
        text: 'paul mccartney temporary secretary'
      });

      chai
        .request(app)
        .post('/playme')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(res.body.text, '<@bing.bong>: Selecting tracks with this command has been deprecated. Please use `/findme` instead.');
          chai.assert.equal(res.body.response_type, 'in_channel');
          chai.assert.isFalse(scope.isDone());
          done();
        });
    });
  });

  describe('/pauseme endpoint', function () {
    it('should pause music playback', function (done) {
      const scope = nock('https://api.spotify.com')
        .put('/v1/me/player/pause')
        .reply(200);

      const body = baseSlackRequest({
        command: '/pauseme'
      });

      chai
        .request(app)
        .post('/pauseme')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(res.body.text, '<@bing.bong>: Paused!');
          chai.assert.equal(res.body.response_type, 'in_channel');
          scope.done();
          done();
        });
    });
  });

  describe('/addplaylist endpoint', function () {
    let scope;

    beforeEach(function () {
      scope = nock('https://api.spotify.com')
        .get('/v1/users/U1AAAAAAA/playlists/P000000000000000000000')
        .reply(200, {
          name: 'My playlist',
          uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000'
        });
    });

    it('should describe its use on invalid requests', function (done) {
      const body = baseSlackRequest({
        command: '/addplaylist',
        text: 'hello'
      });

      chai
        .request(app)
        .post('/addplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(res.body.text, '<@bing.bong>: Didn\'t catch that. Give me an alphanumeric alias for your playlist followed by its URI. You can get the URI from Spotify by clicking Share -> Copy Spotify URI.');
          chai.assert.equal(res.body.response_type, 'in_channel');
          chai.assert.isFalse(scope.isDone());
          done();
        });
    });

    it('should add requested playlist to storage', function (done) {
      const body = baseSlackRequest({
        command: '/addplaylist',
        text: 'myplaylist spotify:user:U1AAAAAAA:playlist:P000000000000000000000'
      });

      chai
        .request(app)
        .post('/addplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(res.body.text, '<@bing.bong>: Added your playlist *My playlist* under the alias *myplaylist*.');
          chai.assert.equal(res.body.response_type, 'in_channel');

          const playlists = store.getPlaylists();
          const playlist = playlists['myplaylist'];

          chai.assert.deepEqual(playlist, {
            id: 'P000000000000000000000',
            user_id: 'U1AAAAAAA',
            tracks: {},
            uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
            name: 'My playlist'
          });

          scope.done();
          done();
        });
    });

    it('should not store invalid playlists', function (done) {
      scope = nock('https://api.spotify.com')
        .get('/v1/users/U1BBBBBBB/playlists/P000000000000000000000')
        .reply(404);

      const body = baseSlackRequest({
        command: '/addplaylist',
        text: 'myplaylist spotify:user:U1BBBBBBB:playlist:P000000000000000000000'
      });

      chai
        .request(app)
        .post('/addplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(res.body.text, '<@bing.bong>: Didn\'t catch that. Give me an alphanumeric alias for your playlist followed by its URI. You can get the URI from Spotify by clicking Share -> Copy Spotify URI.');
          chai.assert.equal(res.body.response_type, 'in_channel');

          const playlists = store.getPlaylists();
          const playlist = playlists['myplaylist'];
          chai.assert.isUndefined(playlist);

          scope.done();
          done();
        });
    });
  });
});
