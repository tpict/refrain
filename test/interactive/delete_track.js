const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const storage = require('node-persist');

const utils = require('../utils');

const app = require('../../src/app');
const store = require('../../src/store');

chai.use(chaiHttp);

describe('/eradicate interactive callback', function () {
  beforeEach(function () {
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
    storage.clearSync();
  });

  it('should delete tracks', function (done) {
    store.setActivePlaylist('myplaylist');
    store.setPlaylists({
      myplaylist: {
        id: 'P000000000000000000000',
        user_id: 'U1AAAAAAA',
        tracks: {
          '6sxosT7KMFP9OQL3DdD6Qy': {
            requester: 'tom.picton',
            artist: 'Jme',
            name: 'Test Me'
          }
        },
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
        name: 'My playlist'
      }
    });

    const removeTrackScope = nock('https://api.spotify.com')
      .delete('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .reply(200);

    const nextTrackScope = nock('https://api.spotify.com')
      .post('/v1/me/player/next')
      .reply(200);

    const body = require('../fixtures/eradicate_delete.json');

    chai
      .request(app)
      .post('/interactive')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: That bad? Let\'s not listen to *Test Me* by *Jme* again. :bomb:'
        );
        removeTrackScope.done();
        nextTrackScope.done();
        done();
      });
  });

  it('should cancel track deletion', function (done) {
    store.setActivePlaylist('myplaylist');
    store.setPlaylists({
      myplaylist: {
        id: 'P000000000000000000000',
        user_id: 'U1AAAAAAA',
        tracks: {
          '6sxosT7KMFP9OQL3DdD6Qy': {
            requester: 'tom.picton',
            artist: 'Jme',
            name: 'Test Me'
          }
        },
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
        name: 'My playlist'
      }
    });

    const removeTrackScope = nock('https://api.spotify.com')
      .delete('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .reply(200);

    const nextTrackScope = nock('https://api.spotify.com')
      .post('/v1/me/player/next')
      .reply(200);

    const body = require('../fixtures/eradicate_cancel.json');

    chai
      .request(app)
      .post('/interactive')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(res.body.text, 'Crisis averted.');
        chai.assert.isFalse(removeTrackScope.isDone());
        chai.assert.isFalse(nextTrackScope.isDone());
        done();
      });
  });
});
