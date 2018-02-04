require('../setup');

const nock = require('nock');
const chai = require('chai');

const utils = require('../utils');

const app = require('../../src/app');
const permissionWrapper = require('../../src/slash_commands/permission_wrapper');

describe('/findme endpoint', function () {
  it('should prompt the user to enter a search query', async function () {
    const scope = nock('https://api.spotify.com')
      .get('/v1/search/')
      .query({ type: 'track', q: 'temporary secretary', limit: 3 })
      .reply(200, require('../fixtures/search.json'));

    const body = utils.baseSlackRequest({
      command: '/findme'
    });

    const res = await chai
      .request(app)
      .post('/findme')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: Please provide a search query.'
    );
    chai.assert.equal(res.body.response_type, 'in_channel');
    chai.assert.isFalse(scope.isDone());
  });

  it('should display search results in an interactive menu', async function () {
    const scope = nock('https://api.spotify.com')
      .get('/v1/search/')
      .query({ type: 'track', q: 'temporary secretary', limit: 3 })
      .reply(200, require('../fixtures/search.json'));

    const body = utils.baseSlackRequest({
      command: '/findme',
      text: 'temporary secretary'
    });

    const res = await chai
      .request(app)
      .post('/findme')
      .send(body);

    chai.assert.deepEqual(
      res.body,
      require('../fixtures/search_response.json')
    );

    scope.done();
  });

  it('should hide the "find more" button on the last page', async function () {
    const response = require('../fixtures/search.json');
    response.tracks.next = null;
    const scope = nock('https://api.spotify.com')
      .get('/v1/search/')
      .query({ type: 'track', q: 'temporary secretary', limit: 3 })
      .reply(200, response);

    const body = utils.baseSlackRequest({
      command: '/findme',
      text: 'temporary secretary'
    });

    const res = await chai
      .request(app)
      .post('/findme')
      .send(body);

    const expected = require('../fixtures/search_response.json');
    expected.attachments.pop();
    chai.assert.deepEqual(res.body, expected);
    scope.done();
  });

  it('should only work when the jukebox is on', async function () {
    permissionWrapper.setOff();
    const body = utils.baseSlackRequest({
      command: '/findme',
      text: 'temporary secretary'
    });

    const res = await chai
      .request(app)
      .post('/findme')
      .send(body);

    chai.assert.equal(
      res.body.text,
      '<@U1AAAAAAA>: The jukebox is off!'
    );
    chai.assert.equal(res.body.response_type, 'in_channel');
  });
});
