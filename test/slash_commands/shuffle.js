require('../setup');

const nock = require('nock');
const chai = require('chai');

const utils = require('../utils');

const app = require('../../src/app');
const permissionWrapper = require('../../src/slash_commands/permission_wrapper');

describe('/shuffle endpoint', function () {
  it('should respond to "/shuffled on"', async function () {
    const scope = nock('https://api.spotify.com')
      .put('/v1/me/player/shuffle')
      .query({
        state: true
      })
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'on'
    });

    const res = await chai
      .request(app)
      .post('/shuffle')
      .send(body);

    chai.assert.equal(res.body.text, '<@U1AAAAAAA>: Shuffle is now on.');
    chai.assert.equal(res.body.response_type, 'in_channel');
    scope.done();
  });

  it('should respond to "/shuffled off"', async function () {
    const scope = nock('https://api.spotify.com')
      .put('/v1/me/player/shuffle')
      .query({
        state: false
      })
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'off'
    });

    const res = await chai
      .request(app)
      .post('/shuffle')
      .send(body);

    chai.assert.equal(res.body.text, '<@U1AAAAAAA>: Shuffle is now off.');
    chai.assert.equal(res.body.response_type, 'in_channel');
    scope.done();
  });

  it('should respond to invalid parameters', async function () {
    const scope = nock('https://api.spotify.com')
      .put('/v1/me/player/shuffle')
      .query(true)
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'hello world'
    });

    const res = await chai
      .request(app)
      .post('/shuffle')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: Please specify `on` or `off`.'
    );
    chai.assert.equal(res.body.response_type, 'in_channel');
    chai.assert.isFalse(scope.isDone());
  });

  it('should only work when the jukebox is on', async function () {
    permissionWrapper.setOff();

    const body = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'hello world'
    });

    const res = await chai
      .request(app)
      .post('/shuffle')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: The jukebox is off!'
    );
    chai.assert.equal(res.body.response_type, 'in_channel');
  });
});
