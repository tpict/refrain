require('../setup');

const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const queryString = require('query-string');

const app = require('../../src/app');
const Playlist = require('../../src/models/playlist');
const Track = require('../../src/models/track');

chai.use(chaiHttp);

describe('/findme interactive callback', function () {
  afterEach(async function () {
    nock.cleanAll();
    await Playlist.remove({});
    await Track.remove({});
  });

  it('should queue tracks', function (done) {
    const addToPlaylistScope = nock('https://api.spotify.com')
      .post('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .reply(200);

    nock('https://slack.com')
      .post('/api/chat.postMessage', () => true)
      .reply(200, (uri, requestBody) => {
        addToPlaylistScope.done();
        Playlist.getActive()
          .then(activePlaylist =>
            activePlaylist.populate('tracks').execPopulate()
          )
          .then(activePlaylist => {
            const storedTracks = activePlaylist.tracks;

            chai.assert.include(storedTracks[0].toObject(), {
              spotifyID: '6sxosT7KMFP9OQL3DdD6Qy',
              requestedBy: 'U1AAAAAAA',
              artist: 'Jme',
              title: 'Test Me'
            });

            const parsedBody = queryString.parse(requestBody);
            chai.assert.equal(
              parsedBody.text,
              '<@U1AAAAAAA> added *Test Me* by *Jme* to *My playlist*'
            );
            chai.assert.equal(parsedBody.channel, 'D1AAAAAAA');
            done();
          });
      });

    const playlist = new Playlist({
      spotifyID: 'P000000000000000000000',
      spotifyUserID: 'U1AAAAAAA',
      name: 'My playlist',
      active: true
    });

    playlist.save().then(() =>
      chai
        .request(app)
        .post('/interactive')
        .send(require('../fixtures/findme_queue.json'))
        .end((err, res) => chai.assert.equal(res.text, 'Just a moment...'))
    );
  });

  it('should play tracks that are already in the playlist immediately', function (
    done
  ) {
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

        Playlist.getActive()
          .then(playlist => playlist.populate('tracks').execPopulate())
          .then(playlist => {
            chai.assert.equal(playlist.tracks.length, 0);

            const parsedBody = queryString.parse(requestBody);
            chai.assert.equal(
              parsedBody.text,
              'Now playing *Test Me* by *Jme*, as requested by <@U1AAAAAAA>'
            );
            chai.assert.equal(parsedBody.channel, 'D1AAAAAAA');

            done();
          });
      });

    const playlist = new Playlist({
      spotifyID: 'P000000000000000000000',
      spotifyUserID: 'U1AAAAAAA',
      name: 'My playlist',
      active: true
    });
    playlist.save().then(() =>
      chai
        .request(app)
        .post('/interactive')
        .send(require('../fixtures/findme_play.json'))
        .end((err, res) => chai.assert.equal(res.text, 'Just a moment...'))
    );
  });
});
