const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('./utils');

const app = require('../src/app');
const store = require('../src/store');

chai.use(chaiHttp);

describe('/whichuser endpoint', function () {
  beforeEach(function () {
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  it('should prompt new users to use /spotifyauth', function (done) {
    store.setActiveUser(null);

    const body = utils.baseSlackRequest({
      command: '/whichuser'
    });

    chai
      .request(app)
      .post('/whichuser')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: No authenticated users yet. Use `/spotifyauth` to get started.'
        );
        done();
      });
  });

  it('should return the active user', function (done) {
    store.setUsers({
      'bing.bong': {
        id: 'myID',
        access_token: 'myAccessToken',
        refresh_token: 'myRefreshToken'
      }
    });
    store.setActiveUser('bing.bong');

    const body = utils.baseSlackRequest({
      command: '/whichuser'
    });

    chai
      .request(app)
      .post('/whichuser')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: The active user is <@bing.bong>'
        );
        done();
      });
  });
});
