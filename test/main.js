const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const nock = require('nock');
const storage = require('node-persist');
const queryString = require('query-string');

process.env.NODE_ENV = 'test';
process.env.STORAGE_DIR = 'test-storage';

const store = require('../src/store');
const getApp = require('../src/app');

const sandbox = sinon.sandbox.create();

chai.use(chaiHttp);
describe('Slack slash command endpoints', function () {
  var app, spotifyApi, webClient;

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

  beforeEach(function (done) {
    store.setUsers({
      'bing.bong': {
        id: 'myID',
        access_token: 'myAccessToken',
        refresh_token: 'myRefreshToken'
      }
    });
    store.setActiveUser('bing.bong');

    const authScope = nock('https://accounts.spotify.com')
      .post('/api/token')
      .reply(200, {
        access_token: 'myNewAccessToken',
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
        expires_in: 3600,
        refresh_token: 'myRefreshToken'
      });

    ({ app, spotifyApi, webClient } = getApp());

    authScope.on('replied', () => { authScope.remove(); done(); });
  });

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
        command: '/commandeer',
        user_name: 'paul.mccartney'
      });

      chai
        .request(app)
        .post('/commandeer')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@paul.mccartney>: You\'re not authenticated with Spotify. Try `/spotifyauth` if you\'d like to get set up'
          );
          chai.assert.isTrue(spotifyApi.setRefreshToken.notCalled);
          chai.assert.isTrue(spotifyApi.setAccessToken.notCalled);
          chai.assert.isFalse(scope.isDone());
          done();
        });
    });

    it('should update Spotify tokens for the commandeering user', function (
      done
    ) {
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
      store.setActiveUser(null);

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
      store.setUsers(null);
      store.setActiveUser(null);

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
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Selecting tracks with this command has been deprecated. Please use `/findme` instead.'
          );
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
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Didn\'t catch that. Give me an alphanumeric alias for your playlist followed by its URI. You can get the URI from Spotify by clicking Share -> Copy Spotify URI.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');
          chai.assert.isFalse(scope.isDone());
          done();
        });
    });

    it('should add requested playlist to storage', function (done) {
      const body = baseSlackRequest({
        command: '/addplaylist',
        text:
          'myplaylist spotify:user:U1AAAAAAA:playlist:P000000000000000000000'
      });

      chai
        .request(app)
        .post('/addplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Added your playlist *My playlist* under the alias *myplaylist*.'
          );
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
        text:
          'myplaylist spotify:user:U1BBBBBBB:playlist:P000000000000000000000'
      });

      chai
        .request(app)
        .post('/addplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Didn\'t catch that. Give me an alphanumeric alias for your playlist followed by its URI. You can get the URI from Spotify by clicking Share -> Copy Spotify URI.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');

          const playlists = store.getPlaylists();
          const playlist = playlists['myplaylist'];
          chai.assert.isUndefined(playlist);

          scope.done();
          done();
        });
    });
  });

  describe('removeplaylist', function () {
    beforeEach(function () {
      store.setPlaylists({
        myplaylist: {
          id: 'P000000000000000000000',
          user_id: 'U1AAAAAAA',
          tracks: {},
          uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
          name: 'My playlist'
        }
      });
    });

    it('should describe its use on invalid requests', function (done) {
      const body = baseSlackRequest({
        command: '/removeplaylist'
      });

      chai
        .request(app)
        .post('/removeplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Please specify the alias of the playlist you wish to remove.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');

          const playlists = store.getPlaylists();
          const playlist = playlists['myplaylist'];
          chai.assert.exists(playlist);
          done();
        });
    });

    it('should tell the user if the playlist doesn\'t exist', function (done) {
      const body = baseSlackRequest({
        command: '/removeplaylist',
        text: 'nonexistentplaylist'
      });

      chai
        .request(app)
        .post('/removeplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: That doesn\'t look like a valid playlist alias! Try `/listplaylists`.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');

          const playlists = store.getPlaylists();
          const playlist = playlists['myplaylist'];
          chai.assert.exists(playlist);
          done();
        });
    });

    it('should delete the given playlist', function (done) {
      const body = baseSlackRequest({
        command: '/removeplaylist',
        text: 'myplaylist'
      });

      chai
        .request(app)
        .post('/removeplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Removed configuration for *My playlist*.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');

          const playlists = store.getPlaylists();
          const playlist = playlists['myplaylist'];
          chai.assert.isUndefined(playlist);
          done();
        });
    });
  });

  describe('/listplaylists endpoint', function () {
    it('should tell the user if there are no playlists', function (done) {
      const body = baseSlackRequest({
        command: '/listplaylists'
      });

      chai
        .request(app)
        .post('/listplaylists')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: There are no configured playlists. Try `/addplaylist` to get started.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');

          done();
        });
    });

    it('should list configured playlists', function (done) {
      store.setPlaylists({
        myplaylist: {
          id: 'P000000000000000000000',
          user_id: 'U1AAAAAAA',
          tracks: {},
          uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
          name: 'My playlist'
        },
        myotherplaylist: {
          id: 'P000000000000000000001',
          user_id: 'U1BBBBBBB',
          tracks: {},
          uri: 'spotify:user:U1BBBBBBB:playlist:P000000000000000000001',
          name: 'My other playlist'
        },
        misconfiguredplaylist: {
          id: 'P000000000000000000002',
          user_id: 'U1CCCCCCC',
          tracks: {},
          uri: 'spotify:user:U1CCCCCCC:playlist:P000000000000000000002',
          name: 'Misconfigured playlist'
        }
      });

      const scope1 = nock('https://api.spotify.com')
        .get('/v1/users/U1AAAAAAA/playlists/P000000000000000000000')
        .reply(200, {
          name: 'My playlist'
        });
      const scope2 = nock('https://api.spotify.com')
        .get('/v1/users/U1BBBBBBB/playlists/P000000000000000000001')
        .reply(200, {
          name: 'My other playlist'
        });
      const scope3 = nock('https://api.spotify.com')
        .get('/v1/users/U1CCCCCCC/playlists/P000000000000000000002')
        .reply(404);

      const body = baseSlackRequest({
        command: '/listplaylists'
      });

      chai
        .request(app)
        .post('/listplaylists')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: \nmyplaylist: My playlist\nmyotherplaylist: My other playlist\nmisconfiguredplaylist: Misconfigured!'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');

          scope1.done();
          scope2.done();
          scope3.done();
          done();
        });
    });
  });

  describe('/playplaylist endpoint', function () {
    let scope;
    beforeEach(function () {
      scope = nock('https://api.spotify.com')
        .put('/v1/me/player/play', {
          context_uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000'
        })
        .reply(200);
    });

    it('should tell the user if the requested playlist isn\'t set up', function (
      done
    ) {
      const body = baseSlackRequest({
        command: '/playplaylist',
        text: 'hello'
      });

      chai
        .request(app)
        .post('/playplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Couldn\'t find a playlist called *hello*.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');
          chai.assert.isFalse(scope.isDone());
          done();
        });
    });

    it('should play the requested playlist', function (done) {
      store.setPlaylists({
        myplaylist: {
          id: 'P000000000000000000000',
          user_id: 'U1AAAAAAA',
          tracks: {},
          uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
          name: 'My playlist'
        }
      });

      const body = baseSlackRequest({
        command: '/playplaylist',
        text: 'myplaylist'
      });

      chai
        .request(app)
        .post('/playplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Now playing from *My playlist*! Commands will now act on this playlist.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');
          scope.done();
          done();
        });
    });
  });

  describe('/whichplaylist endpoint', function () {
    it('should tell the user if no playlist is active', function (done) {
      const body = baseSlackRequest({
        command: '/whichplaylist'
      });

      chai
        .request(app)
        .post('/whichplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: There is no active playlist!'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');
          done();
        });
    });

    it('should tell the user which playlist is active', function (done) {
      store.setActivePlaylist('myplaylist');
      store.setPlaylists({
        myplaylist: {
          id: 'P000000000000000000000',
          user_id: 'U1AAAAAAA',
          tracks: {},
          uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
          name: 'My playlist'
        }
      });

      const body = baseSlackRequest({
        command: '/whichplaylist'
      });

      chai
        .request(app)
        .post('/whichplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: The active playlist is *My playlist*. If that\'s not what you\'re hearing, you\'ll have to select it from Spotify yourself.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');
          done();
        });
    });
  });

  describe('/findme endpoint', function () {
    it('should prompt the user to enter a search query', function (done) {
      const scope = nock('https://api.spotify.com')
        .get('/v1/search/')
        .query({ type: 'track', q: 'temporary secretary', limit: 3 })
        .reply(200, require('./fixtures/search.json'));

      const body = baseSlackRequest({
        command: '/findme'
      });

      chai
        .request(app)
        .post('/findme')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Please provide a search query.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');
          chai.assert.isFalse(scope.isDone());
          done();
        });
    });

    it('should display search results in an interactive menu', function (done) {
      const scope = nock('https://api.spotify.com')
        .get('/v1/search/')
        .query({ type: 'track', q: 'temporary secretary', limit: 3 })
        .reply(200, require('./fixtures/search.json'));

      const body = baseSlackRequest({
        command: '/findme',
        text: 'temporary secretary'
      });

      chai
        .request(app)
        .post('/findme')
        .send(body)
        .end((err, res) => {
          chai.assert.deepEqual(
            res.body,
            require('./fixtures/search_response.json')
          );

          scope.done();
          done();
        });
    });

    it('should hide the "find more" button on the last page', function (done) {
      const response = require('./fixtures/search.json');
      response.tracks.next = null;
      const scope = nock('https://api.spotify.com')
        .get('/v1/search/')
        .query({ type: 'track', q: 'temporary secretary', limit: 3 })
        .reply(200, response);

      const body = baseSlackRequest({
        command: '/findme',
        text: 'temporary secretary'
      });

      chai
        .request(app)
        .post('/findme')
        .send(body)
        .end((err, res) => {
          const expected = require('./fixtures/search_response.json');
          expected.attachments.pop();
          chai.assert.deepEqual(res.body, expected);
          scope.done();
          done();
        });
    });
  });

  describe('/interactive endpoint', function () {
    it('should queue tracks', function (done) {
      store.setActivePlaylist('myplaylist');
      store.setPlaylists({
        myplaylist: {
          id: 'P000000000000000000000',
          user_id: 'U1AAAAAAA',
          tracks: {},
          uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
          name: 'My playlist'
        }
      });

      const addToPlaylistScope = nock('https://api.spotify.com')
        .post('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
        .reply(200);

      nock('https://slack.com')
        .post('/api/chat.postMessage', () => true)
        .reply(200, (uri, requestBody) => {
          console.log('test');

          addToPlaylistScope.done();
          const storedTracks = store.getActivePlaylist().tracks;
          chai.assert.deepEqual(storedTracks['6sxosT7KMFP9OQL3DdD6Qy'], {
            requester: 'tom.picton',
            artist: 'Jme',
            name: 'Test Me'
          });

          const parsedBody = queryString.parse(requestBody);
          chai.assert.equal(
            parsedBody.text,
            '<@tom.picton> added *Test Me* by *Jme* to *My playlist*'
          );
          chai.assert.equal(parsedBody.channel, 'D1KFLA0JF');

          done();
        });

      const body = require('./fixtures/findme_queue.json');

      chai
        .request(app)
        .post('/interactive')
        .send(body)
        .end((err, res) => chai.assert.equal(res.text, 'Just a moment...'));
    });

    it('should play tracks that are already in the playlist immediately', function (
      done
    ) {
      store.setActivePlaylist('myplaylist');
      store.setPlaylists({
        myplaylist: {
          id: 'P000000000000000000000',
          user_id: 'U1AAAAAAA',
          tracks: {},
          uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
          name: 'My playlist'
        }
      });

      const getTracksScope = nock('https://api.spotify.com')
        .get('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
        .reply(200, require('./fixtures/playlist_tracks.json'));

      const getTracksScope2 = nock('https://api.spotify.com')
        .get('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
        .query({
          offset: 3,
          limit: 3
        })
        .reply(200, require('./fixtures/playlist_tracks_2.json'));

      const addToPlaylistScope = nock('https://api.spotify.com')
        .post('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
        .reply(200);

      const playScope = nock('https://api.spotify.com')
        .put(
          '/v1/me/player/play',
          data =>
            data.context_uri ==
              'spotify:user:U1AAAAAAA:playlist:P000000000000000000000' &&
            data.offset.position == 4
        )
        .reply(200);

      nock('https://slack.com')
        .post('/api/chat.postMessage', () => true)
        .reply(200, (uri, requestBody) => {
          getTracksScope.done();
          getTracksScope2.done();
          chai.assert.isFalse(addToPlaylistScope.isDone());
          playScope.done();

          const storedTracks = store.getActivePlaylist().tracks;
          chai.assert.equal(Object.keys(storedTracks).length, 0);

          const parsedBody = queryString.parse(requestBody);
          chai.assert.equal(
            parsedBody.text,
            'Now playing *Test Me* by *Jme*, as requested by <@tom.picton>'
          );
          chai.assert.equal(parsedBody.channel, 'D1KFLA0JF');

          done();
        });

      const body = require('./fixtures/findme_play.json');

      chai
        .request(app)
        .post('/interactive')
        .send(body)
        .end((err, res) => chai.assert.equal(res.text, 'Just a moment...'));
    });
  });
});
