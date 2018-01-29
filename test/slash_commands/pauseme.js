const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const permissionWrapper = require('../../src/slash_commands/permission_wrapper');
const User = require('../../src/models/user');

chai.use(chaiHttp);

describe('/pauseme endpoint', function () {
  beforeEach(async function () {
    await utils.setDefaultUsers();
  });

  afterEach(async function () {
    nock.cleanAll();
    permissionWrapper.setOn();
    await User.remove({});
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

  it('should only work when the jukebox is on', function (done) {
    permissionWrapper.setOff();

    const body = utils.baseSlackRequest({
      command: '/pauseme'
    });

    chai
      .request(app)
      .post('/pauseme')
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
