const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('./utils');

const getApp = require('../src/app');

chai.use(chaiHttp);

describe('/playme endpoint', function () {
  var app;

  beforeEach(function () {
    app = getApp();
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  it('should begin music playback', function (done) {
    const scope = nock('https://api.spotify.com')
      .put('/v1/me/player/play')
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/playme'
    });

    chai
      .request(app)
      .post('/playme')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(res.body.text, '<@bing.bong>: Now playing!');
        chai.assert.equal(res.body.response_type, 'in_channel');
        scope.done();
        done();
      });
  });
});
