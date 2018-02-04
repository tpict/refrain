require('../setup');

const chai = require('chai');

const utils = require('../utils');

const app = require('../../src/app');

describe('/commandeer endpoint', function () {
  it('should reject unauthenticated users', async function () {
    const body = utils.baseSlackRequest({
      command: '/commandeer',
      user_name: 'paul.mccartney',
      user_id: 'U1BBBBBBB'
    });

    const res = await chai
      .request(app)
      .post('/commandeer')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1BBBBBBB>: You\'re not authenticated with Spotify. Try `/spotifyauth` if you\'d like to get set up.'
    );
  });

  it('should pass command to the requesting user', async function () {
    const body = utils.baseSlackRequest({
      command: '/commandeer'
    });

    const res = await chai
      .request(app)
      .post('/commandeer')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: You are now the active user!'
    );
  });
});
