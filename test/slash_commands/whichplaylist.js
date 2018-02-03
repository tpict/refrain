require('../setup');

const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../utils');

const app = require('../../src/app');
const Playlist = require('../../src/models/playlist');

chai.use(chaiHttp);

describe('/whichplaylist endpoint', function () {
  it('should tell the user if no playlist is active', async function () {
    const body = utils.baseSlackRequest({
      command: '/whichplaylist'
    });

    const res = await chai
      .request(app)
      .post('/whichplaylist')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: There is no active playlist!'
    );
    chai.assert.equal(res.body.response_type, 'in_channel');
  });

  it('should tell the user which playlist is active', async function () {
    const playlist = new Playlist({
      spotifyID: 'P000000000000000000000',
      spotifyUserID: 'U1AAAAAAA',
      name: 'My playlist',
      active: true
    });

    await playlist.save();
    const body = utils.baseSlackRequest({
      command: '/whichplaylist'
    });

    const res = await chai
      .request(app)
      .post('/whichplaylist')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: The active playlist is *My playlist*. If that\'s not what you\'re hearing, you\'ll have to select it from Spotify yourself.'
    );
    chai.assert.equal(res.body.response_type, 'in_channel');
  });
});
