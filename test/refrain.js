const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('./utils');

const app = require('../src/app');
const permissionWrapper = require('../src/slash_commands/permission_wrapper');

chai.use(chaiHttp);

describe('/refrain endpoint', function () {
  beforeEach(function () {
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
    permissionWrapper.setOn();
  });

  it('disables commands when switched off', function (done) {
    const pauseScope = nock('https://api.spotify.com')
      .put('/v1/me/player/pause')
      .reply(200);

    const shuffleScope = nock('https://api.spotify.com')
      .put('/v1/me/player/shuffle')
      .query({
        state: true
      })
      .reply(200);

    const shuffleBody = utils.baseSlackRequest({
      command: '/shuffled',
      text: 'off'
    });

    const refrainBody = utils.baseSlackRequest({
      command: '/refrain',
      text: 'off'
    });

    chai
      .request(app)
      .post('/refrain')
      .send(refrainBody)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '_If music be the food of love, play on._ - Shakespeare\nSwitching off.'
        );
        chai.assert.equal(res.body.response_type, 'in_channel');
        pauseScope.done();

        chai
          .request(app)
          .post('/shuffle')
          .send(shuffleBody)
          .end((err, res) => {
            chai.assert.equal(
              res.body.text,
              '<@bing.bong>: The jukebox is off!'
            );
            chai.assert.isFalse(shuffleScope.isDone());
            done();
          });
      });
  });

  it('does not disable itself', function (done) {
    permissionWrapper.setOff();

    nock('https://api.spotify.com')
      .put('/v1/me/player/play')
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/refrain',
      text: 'on'
    });

    chai
      .request(app)
      .post('/refrain')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: Switched on. Add a playlist with `/addplaylist` to get started.'
        );
        done();
      });
  });

  it('can only be switched on by the active user', function (done) {
    permissionWrapper.setOff();

    const playScope = nock('https://api.spotify.com')
      .put('/v1/me/player/play')
      .reply(200);

    const body = utils.baseSlackRequest({
      command: '/refrain',
      text: 'on',
      user_id: 'U1BBBBBBB',
      user_name: 'bing.bing'
    });

    chai
      .request(app)
      .post('/refrain')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bing>: Only the active user may do that.'
        );
        chai.assert.isFalse(playScope.isDone());
        done();
      });
  });
});
