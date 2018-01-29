const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const User = require('../../src/models/user');

chai.use(chaiHttp);

describe('/commandeer endpoint', function () {
  beforeEach(async function () {
    await utils.setDefaultUsers();
  });

  afterEach(async function () {
    nock.cleanAll();
    await User.remove({});
  });

  it('should reject unauthenticated users', function (done) {
    const body = utils.baseSlackRequest({
      command: '/commandeer',
      user_name: 'paul.mccartney',
      user_id: 'U1BBBBBBB'
    });

    chai
      .request(app)
      .post('/commandeer')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@paul.mccartney>: You\'re not authenticated with Spotify. Try `/spotifyauth` if you\'d like to get set up'
        );
        done();
      });
  });

  it('should pass command to the requesting user', function (done) {
    const body = utils.baseSlackRequest({
      command: '/commandeer'
    });

    chai
      .request(app)
      .post('/commandeer')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: You are now the active user!'
        );
        done();
      });
  });
});
