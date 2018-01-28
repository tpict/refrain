const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const storage = require('node-persist');

const utils = require('../utils');

const app = require('../../src/app');
const store = require('../../src/store');

chai.use(chaiHttp);

describe('/listplaylists interactive callback', function () {
  beforeEach(function () {
    utils.setDefaultUsers();
    store.setActivePlaylist('P000000000000000000000');
    store.setPlaylists({
      P000000000000000000000: {
        id: 'P000000000000000000000',
        user_id: 'U1AAAAAAA',
        tracks: {},
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
        name: 'My playlist'
      },
      P000000000000000000001: {
        id: 'P000000000000000000001',
        user_id: 'U1AAAAAAA',
        tracks: {},
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000001',
        name: 'My other playlist'
      }
    });

  });

  afterEach(function () {
    nock.cleanAll();
    storage.clearSync();
  });

  it('should play playlists', function (done) {
    const playScope = nock('https://api.spotify.com')
      .put('/v1/me/player/play')
      .reply(200);

    const body = require('../fixtures/listplaylists_play.json');

    chai
      .request(app)
      .post('/interactive')
      .send(body)
      .end((err, res) => {
        playScope.done();
        chai.assert.equal(
          store.getActivePlaylistAlias(),
          'P000000000000000000001'
        );

        chai.assert.equal(
          res.text,
          'Now playing from *My other playlist*! Commands will now act on this playlist.'
        );

        done();
      });
  });

  it('should remove playlist configurations', function (done) {
    const body = require('../fixtures/listplaylists_remove.json');

    chai
      .request(app)
      .post('/interactive')
      .send(body)
      .end((err, res) => {
        chai.assert.deepEqual(store.getPlaylists(), {
          P000000000000000000000: {
            id: 'P000000000000000000000',
            user_id: 'U1AAAAAAA',
            tracks: {},
            uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
            name: 'My playlist'
          }
        });

        chai.assert.equal(
          res.text,
          'Removed configuration for *My other playlist*.'
        );

        done();
      });
  });
});
