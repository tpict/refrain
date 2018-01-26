const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const queryString = require('query-string');
const storage = require('node-persist');

const utils = require('../utils');

const app = require('../../src/app');
const store = require('../../src/store');

chai.use(chaiHttp);

describe('/findme interactive callback', function () {
  beforeEach(function () {
    utils.setDefaultUsers();
  });

  afterEach(function () {
    nock.cleanAll();
    storage.clearSync();
  });

  it('should queue tracks', function (done) {
    store.setActivePlaylist('myplaylist');
    store.setPlaylists({
      myplaylist: {
        id: 'P000000000000000000000',
        user_id: 'U1AAAAAAA',
        tracks: {},
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
        name: 'My playlist'
      }
    });

    const addToPlaylistScope = nock('https://api.spotify.com')
      .post('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .reply(200);

    nock('https://slack.com')
      .post('/api/chat.postMessage', () => true)
      .reply(200, (uri, requestBody) => {
        addToPlaylistScope.done();
        const storedTracks = store.getActivePlaylist().tracks;
        chai.assert.deepEqual(storedTracks['6sxosT7KMFP9OQL3DdD6Qy'], {
          requester: 'tom.picton',
          artist: 'Jme',
          name: 'Test Me'
        });

        const parsedBody = queryString.parse(requestBody);
        chai.assert.equal(
          parsedBody.text,
          '<@tom.picton> added *Test Me* by *Jme* to *My playlist*'
        );
        chai.assert.equal(parsedBody.channel, 'D1AAAAAAA');

        done();
      });

    const body = require('../fixtures/findme_queue.json');

    chai
      .request(app)
      .post('/interactive')
      .send(body)
      .end((err, res) => chai.assert.equal(res.text, 'Just a moment...'));
  });

  it('should play tracks that are already in the playlist immediately', function (
    done
  ) {
    store.setActivePlaylist('myplaylist');
    store.setPlaylists({
      myplaylist: {
        id: 'P000000000000000000000',
        user_id: 'U1AAAAAAA',
        tracks: {},
        uri: 'spotify:user:U1AAAAAAA:playlist:P000000000000000000000',
        name: 'My playlist'
      }
    });

    const getTracksScope = nock('https://api.spotify.com')
      .get('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .reply(200, require('../fixtures/playlist_tracks.json'));

    const getTracksScope2 = nock('https://api.spotify.com')
      .get('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .query({
        offset: 3,
        limit: 3
      })
      .reply(200, require('../fixtures/playlist_tracks_2.json'));

    const addToPlaylistScope = nock('https://api.spotify.com')
      .post('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .reply(200);

    const playScope = nock('https://api.spotify.com')
      .put(
        '/v1/me/player/play',
        data =>
        data.context_uri ==
        'spotify:user:U1AAAAAAA:playlist:P000000000000000000000' &&
        data.offset.position == 4
      )
      .reply(200);

    nock('https://slack.com')
      .post('/api/chat.postMessage', () => true)
      .reply(200, (uri, requestBody) => {
        getTracksScope.done();
        getTracksScope2.done();
        chai.assert.isFalse(addToPlaylistScope.isDone());
        playScope.done();

        const storedTracks = store.getActivePlaylist().tracks;
        chai.assert.equal(Object.keys(storedTracks).length, 0);

        const parsedBody = queryString.parse(requestBody);
        chai.assert.equal(
          parsedBody.text,
          'Now playing *Test Me* by *Jme*, as requested by <@tom.picton>'
        );
        chai.assert.equal(parsedBody.channel, 'D1AAAAAAA');

        done();
      });

    const body = require('../fixtures/findme_play.json');

    chai
      .request(app)
      .post('/interactive')
      .send(body)
      .end((err, res) => chai.assert.equal(res.text, 'Just a moment...'));
  });

});
