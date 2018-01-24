const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const storage = require('node-persist');

const utils = require('./utils');

const app = require('../src/app');
const store = require('../src/store');

chai.use(chaiHttp);

describe('/listusers endpoint', function () {
  beforeEach(function () {
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
    storage.clearSync();
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
