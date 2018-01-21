const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../test_utils');

const getApp = require('../src/app');
const store = require('../src/store');

chai.use(chaiHttp);

describe('/listusers endpoint', function () {
  var app;

  beforeEach(function () {
    utils.setDefaultUsers();
    app = getApp();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  it('should list authenticated users', function (done) {
    store.setUsers({
      'bing.bong': {
        id: 'myID',
        access_token: 'myAccessToken',
        refresh_token: 'myRefreshToken'
      },
      'another.user': {
        id: 'anotherID',
        access_token: 'anotherAccessToken',
        refresh_token: 'anotherRefreshToken'
      }
    });

    const body = utils.baseSlackRequest({
      command: '/listusers'
    });

    chai
      .request(app)
      .post('/listusers')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: Authenticated users:\nbing.bong\nanother.user'
        );
        done();
      });
  });

  it('should prompt use of /spotifyauth in new workspaces', function (done) {
    store.setUsers(null);
    store.setActiveUser(null);

    const body = utils.baseSlackRequest({
      command: '/listusers'
    });

    chai
      .request(app)
      .post('/listusers')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: No users have been authenticated yet! Try `/spotifyauth` to register yourself.'
        );
        done();
      });
  });
});
