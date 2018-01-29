const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const User = require('../../src/models/user');

chai.use(chaiHttp);

describe('/whichuser endpoint', function () {
  beforeEach(async function () {
    await utils.setDefaultUsers();
  });

  afterEach(async function () {
    nock.cleanAll();
    await User.remove({});
  });

  it('should prompt new users to use /spotifyauth', function (done) {
    User.remove({}).then(() => {
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
  });

  it('should return the active user', function (done) {
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
          '<@bing.bong>: The active user is <@U1AAAAAAA>'
        );
        done();
      });
  });
});
