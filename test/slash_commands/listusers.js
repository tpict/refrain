require('../setup');

const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const User = require('../../src/models/user');

chai.use(chaiHttp);

describe('/listusers endpoint', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  it('should list authenticated users', function (done) {
    const newUser = new User({
      slackID: 'U1BBBBBBB',
      spotifyAccessToken: 'anotherAccessToken',
      spotifyRefreshToken: 'anotherRefreshToken'
    });

    const body = utils.baseSlackRequest({
      command: '/listusers'
    });

    newUser.save(function () {
      chai
        .request(app)
        .post('/listusers')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Authenticated users:\nU1AAAAAAA\nU1BBBBBBB'
          );
          done();
        });
    });
  });

  it('should prompt use of /spotifyauth in new workspaces', function (done) {
    User.remove({}, function () {
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
});
