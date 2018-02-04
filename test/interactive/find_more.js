require('../setup');

const nock = require('nock');
const chai = require('chai');

const app = require('../../src/app');

describe('/findme load more callback', function () {
  it('should return the next page of search results', async function () {
    const scope = nock('https://api.spotify.com')
      .get('/v1/search/')
      .query({ type: 'track', q: 'temporary secretary', offset: 3, limit: 3 })
      .reply(200, require('../fixtures/search_2.json'));

    const res = await chai
      .request(app)
      .post('/interactive')
      .send(require('../fixtures/findme_more.json'));

    chai.assert.deepEqual(
      res.body,
      require('../fixtures/search_response_2.json')
    );

    scope.done();
  });
});
