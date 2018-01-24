const chai = require('chai');
const chaiHttp = require('chai-http');
const nock = require('nock');
const sinon = require('sinon');

const utils = require('./utils');

const app = require('../src/app');

chai.use(chaiHttp);
const sandbox = sinon.sandbox.create();

describe('Spotify authentication refresh', function () {
  let authScope;
  let shuffleScope;

  beforeEach(function () {
    utils.setDefaultUsers();

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
    nock.cleanAll();
    sandbox.restore();
  });

  it('should refresh the access token for users after espiry', function (
    done
  ) {
    const clock = sinon.useFakeTimers(new Date(2049, 2, 1).getTime());

    const body = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'off'
    });

    chai
      .request(app)
      .post('/shuffle')
      .send(body)
      .end(() => {
        clock.restore();
        authScope.done();
        shuffleScope.done();
        done();
      });
  });

  it('should skip refresh if access token is still valid', function (done) {
    const clock = sinon.useFakeTimers(new Date(2049, 0, 1).getTime());

    const body = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'off'
    });

    chai
      .request(app)
      .post('/shuffle')
      .send(body)
      .end(() => {
        clock.restore();
        chai.assert.isFalse(authScope.isDone());
        shuffleScope.done();
        done();
      });
  });
});
