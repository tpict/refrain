const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('./utils');

const getApp = require('../src/app');
const permissionWrapper = require('../src/slash_commands/permission_wrapper');

chai.use(chaiHttp);

describe('/eradicate endpoint', function () {
  var app;

  beforeEach(function () {
    app = getApp();
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
    permissionWrapper.setOn();
  });

  it('should display an interactive confirmation message', function (done) {
    const currentlyPlayingScope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(200, require('./fixtures/currently_playing.json'));

    const body = utils.baseSlackRequest({
      command: '/eradicate'
    });

    const expected = {
      text:
        '<@bing.bong>: Whoa! Are you absolutely positive that you want to delete *Mr. Brightside* by *The Killers*?',
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
                '{"uri":"spotify:track:0eGsygTp906u18L0Oimnem","name":"Mr. Brightside","artist":"The Killers"}'
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

    chai
      .request(app)
      .post('/eradicate')
      .send(body)
      .end((err, res) => {
        chai.assert.deepEqual(res.body, expected);
        currentlyPlayingScope.done();
        done();
      });
  });

  it('should notify the user if no track is playing', function (done) {
    const currentlyPlayingScope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(204);

    const body = utils.baseSlackRequest({
      command: '/eradicate'
    });

    chai
      .request(app)
      .post('/eradicate')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: Are you hearing things? If so, you might want to use `/playplaylist` to try and re-sync things.'
        );
        currentlyPlayingScope.done();
        done();
      });
  });

  it('should only work when the jukebox is on', function (done) {
    permissionWrapper.setOff();

    const body = utils.baseSlackRequest({
      command: '/eradicate'
    });

    chai
      .request(app)
      .post('/eradicate')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: The jukebox is off!'
        );
        chai.assert.equal(res.body.response_type, 'in_channel');
        done();
      });
  });
});
