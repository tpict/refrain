require('../setup');

const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const permissionWrapper = require('../../src/slash_commands/permission_wrapper');

chai.use(chaiHttp);

describe('/refrain endpoint', function () {
  it('disables commands when switched off', async function () {
    const pauseScope = nock('https://api.spotify.com')
      .put('/v1/me/player/pause')
      .reply(200);

    const shuffleScope = nock('https://api.spotify.com')
      .put('/v1/me/player/shuffle')
      .query({
        state: true
      })
      .reply(200);

    const shuffleBody = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'off'
    });

    const refrainBody = utils.baseSlackRequest({
      command: '/refrain',
      text: 'off'
    });

    const res = await chai
      .request(app)
      .post('/refrain')
      .send(refrainBody);

    chai.assert.equal(
      res.body.text,
      '_If music be the food of love, play on._ - Shakespeare\nSwitching off.'
    );
    chai.assert.equal(res.body.response_type, 'in_channel');
    pauseScope.done();

    const shuffleRes = await chai
      .request(app)
      .post('/shuffle')
      .send(shuffleBody);

    chai.assert.equal(
      shuffleRes.body.text,
      '<@U1AAAAAAA>: The jukebox is off!'
    );
    chai.assert.isFalse(shuffleScope.isDone());
  });

  it('does not disable itself', async function () {
    permissionWrapper.setOff();

    nock('https://api.spotify.com')
      .put('/v1/me/player/play')
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/refrain',
      text: 'on'
    });

    const res = await chai
      .request(app)
      .post('/refrain')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: Switched on. Add a playlist with `/addplaylist` to get started.'
    );
  });

  it('can only be switched on by the active user', async function () {
    permissionWrapper.setOff();

    const playScope = nock('https://api.spotify.com')
      .put('/v1/me/player/play')
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/refrain',
      text: 'on',
      user_id: 'U1BBBBBBB',
      user_name: 'bing.bing'
    });

    const res = await chai
      .request(app)
      .post('/refrain')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1BBBBBBB>: Only the active user may do that.'
    );
    chai.assert.isFalse(playScope.isDone());
  });
});
