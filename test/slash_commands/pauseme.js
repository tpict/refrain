require('../setup');

const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const permissionWrapper = require('../../src/slash_commands/permission_wrapper');

chai.use(chaiHttp);

describe('/pauseme endpoint', function () {
  it('should pause music playback', async function () {
    const scope = nock('https://api.spotify.com')
      .put('/v1/me/player/pause')
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/pauseme'
    });

    const res = await chai
      .request(app)
      .post('/pauseme')
      .send(body);

    chai.assert.equal(res.body.text, '<@U1AAAAAAA>: Paused!');
    chai.assert.equal(res.body.response_type, 'in_channel');
    scope.done();
  });

  it('should only work when the jukebox is on', async function () {
    permissionWrapper.setOff();

    const body = utils.baseSlackRequest({
      command: '/pauseme'
    });

    const res = await chai
      .request(app)
      .post('/pauseme')
      .send(body);

    chai.assert.equal(res.body.text, '<@U1AAAAAAA>: The jukebox is off!');
    chai.assert.equal(res.body.response_type, 'in_channel');
  });
});
