const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const storage = require('node-persist');

const utils = require('../utils');

const app = require('../../src/app');
const store = require('../../src/store');

chai.use(chaiHttp);

describe('/listplaylists endpoint', function () {
  beforeEach(function () {
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
    storage.clearSync();
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

  it('should list configured playlists', function (done) {
    store.setPlaylists({
      myplaylist: {
        id: 'P000000000000000000000',
        user_id: 'U1AAAAAAA',
        tracks: {},
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
        name: 'My playlist'
      },
      myotherplaylist: {
        id: 'P000000000000000000001',
        user_id: 'U1BBBBBBB',
        tracks: {},
        uri: 'spotify:user:U1BBBBBBB:playlist:P000000000000000000001',
        name: 'My other playlist'
      },
      misconfiguredplaylist: {
        id: 'P000000000000000000002',
        user_id: 'U1CCCCCCC',
        tracks: {},
        uri: 'spotify:user:U1CCCCCCC:playlist:P000000000000000000002',
        name: 'Misconfigured playlist'
      }
    });

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

    chai
      .request(app)
      .post('/listplaylists')
      .send(body)
      .end((err, res) => {
        console.log(res.body.attachments[0].actions);
        console.log(res.body.attachments[1].actions);
        console.log(res.body.attachments[2].actions);
        chai.assert.deepEqual(
          res.body.attachments,
          require('../fixtures/listplaylists_response.json').attachments
        );

        scope1.done();
        scope2.done();
        scope3.done();
        done();
      });
  });
});
