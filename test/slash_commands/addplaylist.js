require('../setup');

const chai = require('chai');
const chaiHttp = require('chai-http');
const nock = require('nock');

const utils = require('../utils');

const app = require('../../src/app');
const Playlist = require('../../src/models/playlist');

chai.use(chaiHttp);

describe('/addplaylist endpoint', function () {
  var scope;

  beforeEach(async function () {
    scope = nock('https://api.spotify.com')
      .get('/v1/users/U1AAAAAAA/playlists/P000000000000000000000')
      .reply(200, {
        name: 'My playlist',
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000'
      });
  });

  it('should add requested playlist to storage', function (done) {
    const body = utils.baseSlackRequest({
      command: '/addplaylist',
      text: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000'
    });

    chai
      .request(app)
      .post('/addplaylist')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@U1AAAAAAA>: Added your playlist *My playlist*.'
        );
        chai.assert.equal(res.body.response_type, 'in_channel');

        Playlist.findOne(
          {
            spotifyID: 'P000000000000000000000'
          },
          function (err, playlist) {
            chai.assert.include(playlist.toObject(), {
              spotifyID: 'P000000000000000000000',
              spotifyUserID: 'U1AAAAAAA',
              name: 'My playlist'
            });

            scope.done();
            done();
          }
        );
      });
  });

  it('should not store invalid playlists', function (done) {
    scope = nock('https://api.spotify.com')
      .get('/v1/users/U1BBBBBBB/playlists/P000000000000000000000')
      .reply(404);

    const body = utils.baseSlackRequest({
      command: '/addplaylist',
      text: 'myplaylist spotify:user:U1BBBBBBB:playlist:P000000000000000000000'
    });

    chai
      .request(app)
      .post('/addplaylist')
      .send(body)
      .end((err, res) => {
        scope.done();

        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: Couldn\'t find that playlist.'
        );
        chai.assert.equal(res.body.response_type, 'in_channel');

        Playlist.findOne(
          {
            spotifyID: 'P000000000000000000000'
          },
          function (err, playlist) {
            chai.assert.isNull(playlist);
            done();
          }
        );
      });
  });
});
