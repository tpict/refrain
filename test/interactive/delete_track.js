require('../setup');

const nock = require('nock');
const chai = require('chai');

const app = require('../../src/app');

describe('/eradicate interactive callback', function () {
  it('should delete tracks', async function () {
    const removeTrackScope = nock('https://api.spotify.com')
      .delete('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .reply(200);

    const nextTrackScope = nock('https://api.spotify.com')
      .post('/v1/me/player/next')
      .reply(200);

    const body = require('../fixtures/eradicate_delete.json');

    const res = await chai
      .request(app)
      .post('/interactive')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: That bad? Let\'s not listen to *Test Me* by *Jme* again. :bomb:'
    );
    removeTrackScope.done();
    nextTrackScope.done();
  });

  it('should cancel track deletion', async function () {
    const removeTrackScope = nock('https://api.spotify.com')
      .delete('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .reply(200);

    const nextTrackScope = nock('https://api.spotify.com')
      .post('/v1/me/player/next')
      .reply(200);

    const body = require('../fixtures/eradicate_cancel.json');

    const res = await chai
      .request(app)
      .post('/interactive')
      .send(body);

    chai.assert.equal(res.body.text, 'Crisis averted.');
    chai.assert.isFalse(removeTrackScope.isDone());
    chai.assert.isFalse(nextTrackScope.isDone());
  });
});
