const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('./utils');

const app = require('../src/app');
const permissionWrapper = require('../src/slash_commands/permission_wrapper');

chai.use(chaiHttp);

describe('/shuffle endpoint', function () {
  beforeEach(function () {
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
    permissionWrapper.setOn();
  });

  it('should respond to "/shuffled on"', function (done) {
    const scope = nock('https://api.spotify.com')
      .put('/v1/me/player/shuffle')
      .query({
        state: true
      })
      .reply(200);

    const body = utils.baseSlackRequest({
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

  it('should respond to "/shuffled off"', function (done) {
    const scope = nock('https://api.spotify.com')
      .put('/v1/me/player/shuffle')
      .query({
        state: false
      })
      .reply(200);

    const body = utils.baseSlackRequest({
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

  it('should respond to invalid parameters', function (done) {
    const scope = nock('https://api.spotify.com')
      .put('/v1/me/player/shuffle')
      .query(true)
      .reply(200);

    const body = utils.baseSlackRequest({
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

  it('should only work when the jukebox is on', function (done) {
    permissionWrapper.setOff();

    const body = utils.baseSlackRequest({
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
          '<@bing.bong>: The jukebox is off!'
        );
        chai.assert.equal(res.body.response_type, 'in_channel');
        done();
      });
  });
});
