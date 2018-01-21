const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('../test_utils');

const getApp = require('../src/app');
const permissionWrapper = require('../src/slash_commands/permission_wrapper');

chai.use(chaiHttp);

describe('command permissions', function () {
  var app;

  beforeEach(function () {
    utils.setDefaultUsers();
    app = getApp();
  });

  afterEach(function () {
    nock.cleanAll();
    permissionWrapper.setOn();
  });

  it('/pdj endpoint', function (done) {
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

    const pdjBody = utils.baseSlackRequest({
      command: '/pdj',
      text: 'off'
    });

    chai
      .request(app)
      .post('/pdj')
      .send(pdjBody)
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
});
