require('../setup');

const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const app = require('../../src/app');
const Playlist = require('../../src/models/playlist');

chai.use(chaiHttp);

describe('/listplaylists interactive callback', function () {
  beforeEach(async function () {
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

  it('should play playlists', async function () {
    const playScope = nock('https://api.spotify.com')
      .put('/v1/me/player/play')
      .reply(200);

    const body = require('../fixtures/listplaylists_play.json');

    const res = await chai
      .request(app)
      .post('/interactive')
      .send(body);

    playScope.done();

    const activePlaylist = await Playlist.getActive();
    chai.assert.equal(activePlaylist.spotifyID, 'P000000000000000000001');

    chai.assert.equal(
      res.text,
      'Now playing from *My other playlist*! Commands will now act on this playlist.'
    );
  });

  it('should remove playlist configurations', async function () {
    const body = require('../fixtures/listplaylists_remove.json');

    const res = await chai
      .request(app)
      .post('/interactive')
      .send(body);

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
  });
});
