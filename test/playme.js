const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('./utils');

const getApp = require('../src/app');
const permissionWrapper = require('../src/slash_commands/permission_wrapper');

chai.use(chaiHttp);

describe('/playme endpoint', function () {
  var app;

  beforeEach(function () {
    app = getApp();
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
    permissionWrapper.setOn();
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

  it('should only work when the jukebox is on', function (done) {
    permissionWrapper.setOff();
    const body = utils.baseSlackRequest({
      command: '/playme'
    });

    chai
      .request(app)
      .post('/playme')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: The jukebox is off!'
        );
        chai.assert.equal(res.body.response_type, 'in_channel');
        done();
      });
  });
});
