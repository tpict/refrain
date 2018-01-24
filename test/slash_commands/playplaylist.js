const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const storage = require('node-persist');

const utils = require('../utils');

const app = require('../../src/app');
const store = require('../../src/store');
const permissionWrapper = require('../../src/slash_commands/permission_wrapper');

chai.use(chaiHttp);

describe('/playplaylist endpoint', function () {
  var scope;

  beforeEach(function () {
    utils.setDefaultUsers();

    scope = nock('https://api.spotify.com')
      .put('/v1/me/player/play', {
        context_uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000'
      })
      .reply(200);
  });

  afterEach(function () {
    nock.cleanAll();
    permissionWrapper.setOn();
    storage.clearSync();
  });

  it('should tell the user if the requested playlist isn\'t set up', function (
    done
  ) {
    const body = utils.baseSlackRequest({
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

    const body = utils.baseSlackRequest({
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

  it('should only work when the jukebox is on', function (done) {
    permissionWrapper.setOff();
    const body = utils.baseSlackRequest({
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
          '<@bing.bong>: The jukebox is off!'
        );
        chai.assert.equal(res.body.response_type, 'in_channel');
        done();
      });
  });
});
