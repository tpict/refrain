const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

const utils = require('./utils');

const getApp = require('../src/app');

chai.use(chaiHttp);

describe('/findme endpoint', function () {
  var app;

  beforeEach(function () {
    app = getApp();
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  it('should prompt the user to enter a search query', function (done) {
    const scope = nock('https://api.spotify.com')
      .get('/v1/search/')
      .query({ type: 'track', q: 'temporary secretary', limit: 3 })
      .reply(200, require('./fixtures/search.json'));

    const body = utils.baseSlackRequest({
      command: '/findme'
    });

    chai
      .request(app)
      .post('/findme')
      .send(body)
      .end((err, res) => {
        chai.assert.equal(
          res.body.text,
          '<@bing.bong>: Please provide a search query.'
        );
        chai.assert.equal(res.body.response_type, 'in_channel');
        chai.assert.isFalse(scope.isDone());
        done();
      });
  });

  it('should display search results in an interactive menu', function (done) {
    const scope = nock('https://api.spotify.com')
      .get('/v1/search/')
      .query({ type: 'track', q: 'temporary secretary', limit: 3 })
      .reply(200, require('./fixtures/search.json'));

    const body = utils.baseSlackRequest({
      command: '/findme',
      text: 'temporary secretary'
    });

    chai
      .request(app)
      .post('/findme')
      .send(body)
      .end((err, res) => {
        chai.assert.deepEqual(
          res.body,
          require('./fixtures/search_response.json')
        );

        scope.done();
        done();
      });
  });

  it('should hide the "find more" button on the last page', function (done) {
    const response = require('./fixtures/search.json');
    response.tracks.next = null;
    const scope = nock('https://api.spotify.com')
      .get('/v1/search/')
      .query({ type: 'track', q: 'temporary secretary', limit: 3 })
      .reply(200, response);

    const body = utils.baseSlackRequest({
      command: '/findme',
      text: 'temporary secretary'
    });

    chai
      .request(app)
      .post('/findme')
      .send(body)
      .end((err, res) => {
        const expected = require('./fixtures/search_response.json');
        expected.attachments.pop();
        chai.assert.deepEqual(res.body, expected);
        scope.done();
        done();
      });
  });
});

