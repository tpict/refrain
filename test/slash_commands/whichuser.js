require('../setup');

const chai = require('chai');

const utils = require('../utils');

const app = require('../../src/app');
const User = require('../../src/models/user');

describe('/whichuser endpoint', function () {
  it('should prompt new users to use /spotifyauth', async function () {
    await User.remove({});
    const body = utils.baseSlackRequest({
      command: '/whichuser'
    });

    const res = await chai
      .request(app)
      .post('/whichuser')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: No users have been authenticated yet! Try `/spotifyauth` to register yourself.'
    );
  });

  it('should return the active user', async function () {
    const body = utils.baseSlackRequest({
      command: '/whichuser'
    });

    const res = await chai
      .request(app)
      .post('/whichuser')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: The active user is <@U1AAAAAAA>'
    );
  });
});
