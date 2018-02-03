require('../setup');

const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const User = require('../../src/models/user');

chai.use(chaiHttp);

describe('/listusers endpoint', function () {
  it('should list authenticated users', async function () {
    const newUser = new User({
      slackID: 'U1BBBBBBB',
      spotifyAccessToken: 'anotherAccessToken',
      spotifyRefreshToken: 'anotherRefreshToken'
    });

    const body = utils.baseSlackRequest({
      command: '/listusers'
    });

    await newUser.save();
    const res = await chai
      .request(app)
      .post('/listusers')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: Authenticated users:\nU1AAAAAAA\nU1BBBBBBB'
    );
  });

  it('should prompt use of /spotifyauth in new workspaces', async function () {
    await User.remove({});

    const body = utils.baseSlackRequest({
      command: '/listusers'
    });

    const res = await chai
      .request(app)
      .post('/listusers')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: No users have been authenticated yet! Try `/spotifyauth` to register yourself.'
    );
  });
});
