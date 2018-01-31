const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const Playlist = require('../../src/models/playlist');

chai.use(chaiHttp);

describe('/listplaylists interactive callback', function () {
  beforeEach(async function () {
    await utils.setDefaultUsers();

    await Playlist.insertMany([
      {
        spotifyID: 'P000000000000000000000',
        spotifyUserID: 'U1AAAAAAA',
        name: 'My playlist',
        active: true
      },
      {
        spotifyID: 'P000000000000000000001',
        spotifyUserID: 'U1AAAAAAA',
        name: 'My other playlist'
      }
    ]);
  });

  afterEach(async function () {
    nock.cleanAll();
    await Playlist.remove({});
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

        Playlist.getActive().then(playlist => {
          chai.assert.equal(playlist.spotifyID, 'P000000000000000000001');

          chai.assert.equal(
            res.text,
            'Now playing from *My other playlist*! Commands will now act on this playlist.'
          );

          done();
        });
      });
  });

  it('should remove playlist configurations', function (done) {
    const body = require('../fixtures/listplaylists_remove.json');

    chai
      .request(app)
      .post('/interactive')
      .send(body)
      .end(async (err, res) => {
        const playlists = await Playlist.find({});
        chai.assert.equal(playlists.length, 1);
        chai.assert.include(playlists[0].toObject(), {
          spotifyID: 'P000000000000000000000',
          spotifyUserID: 'U1AAAAAAA',
          name: 'My playlist'
        });

        chai.assert.equal(
          res.text,
          'Removed configuration for *My other playlist*.'
        );

        done();
      });
  });
});
