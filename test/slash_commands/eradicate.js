require('../setup');

const nock = require('nock');
const chai = require('chai');

const utils = require('../utils');

const app = require('../../src/app');
const permissionWrapper = require('../../src/slash_commands/permission_wrapper');

describe('/eradicate endpoint', function () {
  it('should display an interactive confirmation message', async function () {
    const currentlyPlayingScope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(200, require('../fixtures/currently_playing.json'));

    const body = utils.baseSlackRequest({
      command: '/eradicate'
    });

    const expected = {
      text:
        '<@U1AAAAAAA>: Whoa! Are you absolutely positive that you want to delete *Mr. Brightside* by *The Killers*?',
      attachments: [
        {
          fallback: 'Your device doesn\'t support this.',
          callback_id: 'delete_track',
          color: 'danger',
          actions: [
            {
              name: 'delete',
              text: 'Do it.',
              type: 'button',
              style: 'danger',
              value:
                '{"spotifyID":"0eGsygTp906u18L0Oimnem","title":"Mr. Brightside","artist":"The Killers"}'
            },
            {
              name: 'cancel',
              text: 'Cancel',
              type: 'button',
              value: {}
            }
          ]
        }
      ],
      response_type: 'in_channel'
    };

    const res = await chai
      .request(app)
      .post('/command')
      .send(body);

    chai.assert.deepEqual(res.body, expected);
    currentlyPlayingScope.done();
  });

  it('should notify the user if no track is playing', async function () {
    const currentlyPlayingScope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(204);

    const body = utils.baseSlackRequest({
      command: '/eradicate'
    });

    const res = await chai
      .request(app)
      .post('/command')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: Are you hearing things? If so, you might want to use `/listplaylists` to try and re-sync things.'
    );
    currentlyPlayingScope.done();
  });

  it('should only work when the jukebox is on', async function () {
    permissionWrapper.setOff();

    const body = utils.baseSlackRequest({
      command: '/eradicate'
    });

    const res = await chai
      .request(app)
      .post('/command')
      .send(body);

    chai.assert.equal(res.body.text, '<@U1AAAAAAA>: The jukebox is off!');
    chai.assert.equal(res.body.response_type, 'in_channel');
  });
});
