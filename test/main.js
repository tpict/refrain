const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const should = chai.should();
const nock = require('nock');

const { app, spotifyApi, webClient } = require('../src/app');
const store = require('../src/store');

const sandbox = sinon.sandbox.create();

process.env.NODE_ENV = 'test';

chai.use(chaiHttp);
describe('Slack slash command endpoints', function () {
  function baseSlackRequest(fields = {}) {
    return Object.assign(
      {
        token: 'mYslacKTOkeN123456789000',
        team_id: 'T0AAAAAAA',
        team_domain: 'refrain',
        channel_id: 'D1AAAAAAA',
        channel_name: 'directmessage',
        user_id: 'U1AAAAAAA',
        user_name: 'bing.bong',
        command: '',
        text: '',
        response_url:
          'https://hooks.slack.com/commands/T0AAAAAAA/123456789000/AAAAAAAAAAAAAAAAAAAAAAAA',
        trigger_id: '123456789000.1234567890.abcdeff123aaa1111111111111111111'
      },
      fields
    );
  }

  afterEach(function () {
    sandbox.restore();
  });

  describe('/shuffle endpoint', function () {
    it('responds to "/shuffled on"', function (done) {
      const scope = nock('https://api.spotify.com')
        .put('/v1/me/player/shuffle')
        .query({
          state: true
        })
        .reply(200);

      const body = baseSlackRequest({
        command: '/shuffled',
        text: 'on'
      });

      chai
        .request(app)
        .post('/shuffle')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(res.body.text, '<@bing.bong>: Shuffle is now on.');
          chai.assert.equal(res.body.response_type, 'in_channel');
          scope.done();
          done();
        });
    });

    it('responds to "/shuffled off"', function (done) {
      const scope = nock('https://api.spotify.com')
        .put('/v1/me/player/shuffle')
        .query({
          state: false
        })
        .reply(200);

      const body = baseSlackRequest({
        command: '/shuffled',
        text: 'off'
      });

      chai
        .request(app)
        .post('/shuffle')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(res.body.text, '<@bing.bong>: Shuffle is now off.');
          chai.assert.equal(res.body.response_type, 'in_channel');
          scope.done();
          done();
        });
    });

    it('responds to invalid parameters', function (done) {
      const scope = nock('https://api.spotify.com')
        .put('/v1/me/player/shuffle')
        .query(true)
        .reply(200);

      const body = baseSlackRequest({
        command: '/shuffled',
        text: 'hello world'
      });

      chai
        .request(app)
        .post('/shuffle')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: Please specify `on` or `off`.'
          );
          chai.assert.equal(res.body.response_type, 'in_channel');
          chai.assert.isFalse(scope.isDone());
          done();
        });
    });
  });

  describe('/commandeer endpoint', function () {
    it('rejects unauthenticated users', function (done) {
      sandbox.spy(spotifyApi, 'setRefreshToken');
      sandbox.spy(spotifyApi, 'setAccessToken');

      const body = baseSlackRequest({
        command: '/commandeer'
      });

      chai
        .request(app)
        .post('/commandeer')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: You\'re not authenticated with Spotify. Try `/spotifyauth` if you\'d like to get set up'
          );
          chai.assert.isTrue(spotifyApi.setRefreshToken.notCalled);
          chai.assert.isTrue(spotifyApi.setAccessToken.notCalled);
          done();
        });
    });

    it('updates Spotify tokens for the commandeering user', function (done) {
      sandbox.spy(spotifyApi, 'setRefreshToken');
      sandbox.spy(spotifyApi, 'setAccessToken');

      store.setUsers({
        'bing.bong': {
          id: 'myID',
          access_token: 'myAccessToken',
          refresh_token: 'myRefreshToken'
        }
      });

      const body = baseSlackRequest({
        command: '/commandeer'
      });

      chai
        .request(app)
        .post('/commandeer')
        .send(body)
        .end((err, res) => {
          chai.assert.equal(
            res.body.text,
            '<@bing.bong>: You are now the active user!'
          );
          chai.assert.isTrue(spotifyApi.setRefreshToken.calledOnce);
          chai.assert.isTrue(spotifyApi.setAccessToken.calledOnce);
          done();
        });
    });
  });
});
