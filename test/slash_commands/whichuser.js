require('../setup');

const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const User = require('../../src/models/user');

chai.use(chaiHttp);

describe('/whichuser endpoint', function () {
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
          console.log(res);
          chai.assert.equal(
            res.body.text,
            '<@U1AAAAAAA>: No authenticated users yet. Use `/spotifyauth` to get started.'
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
          '<@U1AAAAAAA>: The active user is <@U1AAAAAAA>'
        );
        done();
      });
  });
});
