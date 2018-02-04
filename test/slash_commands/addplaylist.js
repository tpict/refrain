require('../setup');

const chai = require('chai');
const nock = require('nock');

const utils = require('../utils');

const app = require('../../src/app');
const Playlist = require('../../src/models/playlist');

describe('/addplaylist endpoint', function () {
  let scope;

  beforeEach(async function () {
    scope = nock('https://api.spotify.com')
      .get('/v1/users/U1AAAAAAA/playlists/P000000000000000000001')
      .reply(200, {
        name: 'My playlist',
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000001'
      });
  });

  it('should add requested playlist to storage', async function () {
    const existingPlaylist = await Playlist.getActive();

    const body = utils.baseSlackRequest({
      command: '/addplaylist',
      text: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000001'
    });

    const res = await chai
      .request(app)
      .post('/addplaylist')
      .send(body);

    scope.done();

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: Added your playlist *My playlist*.'
    );
    chai.assert.equal(res.body.response_type, 'in_channel');

    const playlist = await Playlist.findOne({
      spotifyID: 'P000000000000000000001'
    });
    chai.assert.include(playlist.toObject(), {
      spotifyID: 'P000000000000000000001',
      spotifyUserID: 'U1AAAAAAA',
      name: 'My playlist'
    });

    // The active playlist shouldn't be changed since one is already set
    const activePlaylist = await Playlist.getActive();
    chai.assert.isTrue(activePlaylist.equals(existingPlaylist));
  });

  it('should make the first added playlist the active one', async function () {
    await Playlist.remove({});

    const body = utils.baseSlackRequest({
      command: '/addplaylist',
      text: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000001'
    });

    const res = await chai
      .request(app)
      .post('/addplaylist')
      .send(body);

    scope.done();

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: Added your playlist *My playlist*.'
    );
    chai.assert.equal(res.body.response_type, 'in_channel');

    const playlist = await Playlist.findOne({
      spotifyID: 'P000000000000000000001'
    });
    chai.assert.include(playlist.toObject(), {
      spotifyID: 'P000000000000000000001',
      spotifyUserID: 'U1AAAAAAA',
      name: 'My playlist',
      active: true
    });
  });

  it('should not store invalid playlists', async function () {
    scope = nock('https://api.spotify.com')
      .get('/v1/users/U1BBBBBBB/playlists/P000000000000000000001')
      .reply(404);

    const body = utils.baseSlackRequest({
      command: '/addplaylist',
      text: 'myplaylist spotify:user:U1BBBBBBB:playlist:P000000000000000000001'
    });

    const res = await chai
      .request(app)
      .post('/addplaylist')
      .send(body);

    scope.done();

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: Couldn\'t find that playlist.'
    );
    chai.assert.equal(res.body.response_type, 'in_channel');

    const playlist = await Playlist.findOne({
      spotifyID: 'P000000000000000000001'
    });
    chai.assert.isNull(playlist);
  });
});
