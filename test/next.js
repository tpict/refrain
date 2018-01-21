const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const queryString = require('query-string');

const utils = require('../test_utils');

const getApp = require('../src/app');

chai.use(chaiHttp);

describe('/next endpoint', function () {
  var app;

  beforeEach(function () {
    utils.setDefaultUsers();
    app = getApp();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  it('should skip tracks as requested', function (done) {
    const nextTrackScope = nock('https://api.spotify.com')
      .post('/v1/me/player/next')
      .reply(200);

    const currentlyPlayingScope = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(200, require('./fixtures/currently_playing.json'));

    const currentlyPlayingScope2 = nock('https://api.spotify.com')
      .get('/v1/me/player/currently-playing')
      .reply(200, require('./fixtures/currently_playing_2.json'));

    nock('https://slack.com')
      .post('/api/chat.postMessage', () => true)
      .reply(200, (uri, requestBody) => {
        nextTrackScope.done();
        currentlyPlayingScope2.done();

        const parsedBody = queryString.parse(requestBody);
        chai.assert.equal(
          parsedBody.text,
          'Now playing *Psycho Killer - 2005 Remastered Version* by *Talking Heads*'
        );
        chai.assert.equal(parsedBody.channel, 'D1AAAAAAA');

        done();
      });

    const body = utils.baseSlackRequest({
      command: '/next'
    });

    chai
      .request(app)
      .post('/next')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: Skipping *Mr. Brightside* by *The Killers*...'
        );
        currentlyPlayingScope.done();
      });
  });
});
