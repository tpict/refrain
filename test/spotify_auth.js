const chai = require('chai');
const chaiHttp = require('chai-http');
const nock = require('nock');
const sinon = require('sinon');
const moment = require('moment');

const utils = require('./utils');

const app = require('../src/app');
const User = require('../src/models/user');

chai.use(chaiHttp);
const sandbox = sinon.sandbox.create();

describe('Spotify authentication refresh', function () {
  let authScope;
  let shuffleScope;
  let clock;

  beforeEach(async function () {
    let theMoment = moment();
    sinon.stub(moment.prototype, 'constructor');
    moment.prototype.constructor.returns(theMoment);
    // clock = sinon.useFakeTimers(new Date(2049, 2, 1).getTime());

    authScope = await nock('https://accounts.spotify.com')
      .post('/api/token')
      .reply(200, {
        access_token: 'myNewAccessToken',
        refresh_token: 'myRefreshToken',
        expires_in: 3600
      });

    shuffleScope = await nock('https://api.spotify.com')
      .put('/v1/me/player/shuffle')
      .query({
        state: false
      })
      .reply(200);

    return utils.setDefaultUsers();
  });

  afterEach(function (done) {
    nock.cleanAll();
    sandbox.restore();
    // clock.restore();
    User.remove({}, done);
  });

  it('should refresh the access token for users after expiry', function (done) {
    const body = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'off'
    });

    chai
      .request(app)
      .post('/shuffle')
      .send(body)
      .end(() => {
        authScope.done();
        shuffleScope.done();
        done();
      });
  });

  it('should refresh the access token for users with no set expiry', function (
    done
  ) {
    User.getActive(function (err, user) {
      user.spotifyTokenExpiry = undefined;
      user.save(function () {
        const body = utils.baseSlackRequest({
          command: '/shuffled',
          text: 'off'
        });

        chai
          .request(app)
          .post('/shuffle')
          .send(body)
          .end(() => {
            authScope.done();
            shuffleScope.done();
            done();
          });
      });
    });
  });

  it('should skip refresh if access token is still valid', function (done) {
    const body = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'off'
    });

    chai
      .request(app)
      .post('/shuffle')
      .send(body)
      .end(() => {
        chai.assert.isFalse(authScope.isDone());
        shuffleScope.done();
        done();
      });
  });
});
