require('../setup');

const nock = require('nock');
const chai = require('chai');

const utils = require('../utils');

const app = require('../../src/app');
const permissionWrapper = require('../../src/slash_commands/permission_wrapper');

describe('/next endpoint', function () {
  it('should skip tracks as requested', async function () {
    const nextTrackScope = nock('https://api.spotify.com')
      .post('/v1/me/player/next')
      .reply(200);

    const currentlyPlayingScope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(200, require('../fixtures/currently_playing.json'));

    const currentlyPlayingScope2 = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(200, require('../fixtures/currently_playing_2.json'));

    const webScope = nock('https://slack.com')
      .post('/api/chat.postMessage', {
        channel: 'D1AAAAAAA',
        text:
          'Now playing *Psycho Killer - 2005 Remastered Version* by *Talking Heads*'
      })
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/next'
    });

    const res = await chai
      .request(app)
      .post('/command')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: Skipping *Mr. Brightside* by *The Killers*...'
    );
    currentlyPlayingScope.done();

    await new Promise(resolve =>
      webScope.on('replied', () => {
        nextTrackScope.done();
        currentlyPlayingScope2.done();
        resolve();
      })
    );
  });

  it('should only work when the jukebox is on', async function () {
    permissionWrapper.setOff();

    const body = utils.baseSlackRequest({
      command: '/next'
    });

    const res = await chai
      .request(app)
      .post('/command')
      .send(body);

    chai.assert.equal(res.body.text, '<@U1AAAAAAA>: The jukebox is off!');
    chai.assert.equal(res.body.response_type, 'in_channel');
  });
});
