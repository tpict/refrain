require('./setup');

const chai = require('chai');
const nock = require('nock');
const sinon = require('sinon');
const moment = require('moment');

const utils = require('./utils');

const app = require('../src/app');
const User = require('../src/models/user');

const sandbox = sinon.sandbox.create();

describe('Spotify authentication refresh', function () {
  let authScope;
  let shuffleScope;

  beforeEach(function () {
    authScope = nock('https://accounts.spotify.com')
      .post('/api/token')
      .reply(200, {
        access_token: 'myNewAccessToken',
        refresh_token: 'myRefreshToken',
        expires_in: 3600
      });

    shuffleScope = nock('https://api.spotify.com')
      .put('/v1/me/player/shuffle')
      .query({
        state: false
      })
      .reply(200);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should refresh the access token for users after expiry', async function () {
    const theFuture = moment('2049-02-01');
    sandbox.stub(moment, 'now').callsFake(function () {
      return theFuture;
    });

    const body = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'off'
    });

    await chai
      .request(app)
      .post('/shuffle')
      .send(body);

    authScope.done();
    shuffleScope.done();
  });

  it('should refresh the access token for users with no set expiry', async function () {
    const user = await User.getActive();
    user.spotifyTokenExpiry = undefined;
    await user.save();

    const body = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'off'
    });

    await chai
      .request(app)
      .post('/shuffle')
      .send(body);

    authScope.done();
    shuffleScope.done();
  });

  it('should skip refresh if access token is still valid', async function () {
    const theFuture = moment('2049-01-01');
    sandbox.stub(moment, 'now').callsFake(function () {
      return theFuture;
    });

    const body = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'off'
    });

    await chai
      .request(app)
      .post('/shuffle')
      .send(body);

    chai.assert.isFalse(authScope.isDone());
    shuffleScope.done();
  });
});
