const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('./utils');

const getApp = require('../src/app');

chai.use(chaiHttp);

describe('/pauseme endpoint', function () {
  var app;

  beforeEach(function () {
    app = getApp();
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  it('should pause music playback', function (done) {
    const scope = nock('https://api.spotify.com')
      .put('/v1/me/player/pause')
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/pauseme'
    });

    chai
      .request(app)
      .post('/pauseme')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(res.body.text, '<@bing.bong>: Paused!');
        chai.assert.equal(res.body.response_type, 'in_channel');
        scope.done();
        done();
      });
  });
});
