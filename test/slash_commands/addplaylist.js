const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const storage = require('node-persist');

const utils = require('../utils');

const app = require('../../src/app');
const store = require('../../src/store');

chai.use(chaiHttp);

describe('/addplaylist endpoint', function () {
  var scope;

  beforeEach(function () {
    utils.setDefaultUsers();

    scope = nock('https://api.spotify.com')
      .get('/v1/users/U1AAAAAAA/playlists/P000000000000000000000')
      .reply(200, {
        name: 'My playlist',
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000'
      });
  });

  afterEach(function () {
    nock.cleanAll();
    storage.clearSync();
  });

  it('should describe its use on invalid requests', function (done) {
    const body = utils.baseSlackRequest({
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
    const body = utils.baseSlackRequest({
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

    const body = utils.baseSlackRequest({
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
