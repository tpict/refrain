const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const Playlist = require('../../src/models/playlist');
const Track = require('../../src/models/track');

chai.use(chaiHttp);

describe('/eradicate interactive callback', function () {
  beforeEach(async function () {
    utils.setDefaultUsers();

    const track = new Track({
      requestedBy: 'U1AAAAAAA',
      artist: 'Jme',
      title: 'Test Me'
    });
    await track.save();

    const playlist = new Playlist({
      spotifyID: 'P000000000000000000000',
      spotifyUserID: 'U1AAAAAAA',
      tracks: [track._id],
      name: 'My playlist',
      active: true
    });
    await playlist.save();
  });

  afterEach(async function () {
    nock.cleanAll();
    await Playlist.remove({});
    await Track.remove({});
  });

  it('should delete tracks', function (done) {
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
