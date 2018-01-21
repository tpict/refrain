const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../test_utils');

const getApp = require('../src/app');
const store = require('../src/store');

chai.use(chaiHttp);

describe('removeplaylist', function () {
  var app;

  beforeEach(function () {
    utils.setDefaultUsers();
    app = getApp();

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

  afterEach(function () {
    nock.cleanAll();
  });

  it('should describe its use on invalid requests', function (done) {
    const body = utils.baseSlackRequest({
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
    const body = utils.baseSlackRequest({
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
    const body = utils.baseSlackRequest({
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
