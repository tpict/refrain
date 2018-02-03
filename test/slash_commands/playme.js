require('../setup');

const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const permissionWrapper = require('../../src/slash_commands/permission_wrapper');

chai.use(chaiHttp);

describe('/playme endpoint', function () {
  it('should begin music playback', async function () {
    const scope = nock('https://api.spotify.com')
      .put('/v1/me/player/play')
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/playme'
    });

    const res = await chai
      .request(app)
      .post('/playme')
      .send(body);

    chai.assert.equal(res.body.text, '<@U1AAAAAAA>: Now playing!');
    chai.assert.equal(res.body.response_type, 'in_channel');
    scope.done();
  });

  it('should only work when the jukebox is on', async function () {
    permissionWrapper.setOff();
    const body = utils.baseSlackRequest({
      command: '/playme'
    });

    const res = await chai
      .request(app)
      .post('/playme')
      .send(body);

    chai.assert.equal(res.body.text, '<@U1AAAAAAA>: The jukebox is off!');
    chai.assert.equal(res.body.response_type, 'in_channel');
  });
});
