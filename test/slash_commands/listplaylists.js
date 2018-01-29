const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const Playlist = require('../../src/models/playlist');
const User = require('../../src/models/user');

chai.use(chaiHttp);

describe('/listplaylists endpoint', function () {
  beforeEach(async function () {
    await utils.setDefaultUsers();
  });

  afterEach(async function () {
    nock.cleanAll();
    await Playlist.remove({});
    await User.remove({});
  });

  it('should tell the user if there are no playlists', function (done) {
    const body = utils.baseSlackRequest({
      command: '/listplaylists'
    });

    chai
      .request(app)
      .post('/listplaylists')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: There are no configured playlists. Try `/addplaylist` to get started.'
        );
        chai.assert.equal(res.body.response_type, 'in_channel');

        done();
      });
  });

  it('should list configured playlists', async function () {
    await Playlist.insertMany([
      {
        spotifyID: 'P000000000000000000000',
        spotifyUserID: 'U1AAAAAAA',
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
        name: 'My playlist'
      },
      {
        spotifyID: 'P000000000000000000001',
        spotifyUserID: 'U1BBBBBBB',
        uri: 'spotify:user:U1BBBBBBB:playlist:P000000000000000000001',
        name: 'My other playlist'
      },
      {
        spotifyID: 'P000000000000000000002',
        spotifyUserID: 'U1CCCCCCC',
        uri: 'spotify:user:U1CCCCCCC:playlist:P000000000000000000002',
        name: 'Misconfigured playlist'
      }
    ]);

    const scope1 = nock('https://api.spotify.com')
      .get('/v1/users/U1AAAAAAA/playlists/P000000000000000000000')
      .reply(200, {
        id: 'P000000000000000000000',
        name: 'My playlist',
        tracks: {
          total: 5
        },
        images: [{ url: 'https://spotify.com/lovely_image.jpg' }]
      });
    const scope2 = nock('https://api.spotify.com')
      .get('/v1/users/U1BBBBBBB/playlists/P000000000000000000001')
      .reply(200, {
        id: 'P000000000000000000001',
        name: 'My other playlist',
        tracks: {
          total: 10
        },
        images: [{ url: 'https://spotify.com/cool_image.jpg' }]
      });
    const scope3 = nock('https://api.spotify.com')
      .get('/v1/users/U1CCCCCCC/playlists/P000000000000000000002')
      .reply(404);

    const body = utils.baseSlackRequest({
      command: '/listplaylists'
    });

    return chai
      .request(app)
      .post('/listplaylists')
      .send(body)
      .then((res) => {
        chai.assert.deepEqual(
          res.body.attachments,
          require('../fixtures/listplaylists_response.json').attachments
        );

        scope1.done();
        scope2.done();
        scope3.done();
      });
  });
});
