const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const Playlist = require('../../src/models/playlist');

chai.use(chaiHttp);

describe('/whichplaylist endpoint', function () {
  beforeEach(function () {
    utils.setDefaultUsers();
  });

  afterEach(async function () {
    nock.cleanAll();
    await Playlist.remove({});
  });

  it('should tell the user if no playlist is active', function (done) {
    const body = utils.baseSlackRequest({
      command: '/whichplaylist'
    });

    chai
      .request(app)
      .post('/whichplaylist')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: There is no active playlist!'
        );
        chai.assert.equal(res.body.response_type, 'in_channel');
        done();
      });
  });

  it('should tell the user which playlist is active', function (done) {
    const playlist = new Playlist({
      spotifyID: 'P000000000000000000000',
      spotifyUserID: 'U1AAAAAAA',
      name: 'My playlist',
      active: true
    });
    playlist.save().then(() => {
      const body = utils.baseSlackRequest({
        command: '/whichplaylist'
      });

      chai
        .request(app)
        .post('/whichplaylist')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: The active playlist is *My playlist*. If that\'s not what you\'re hearing, you\'ll have to select it from Spotify yourself.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');
          done();
        });
    });
  });
});
