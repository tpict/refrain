require('../setup');

const nock = require('nock');
const chai = require('chai');

const app = require('../../src/app');
const Playlist = require('../../src/models/playlist');

describe('/findme interactive callback', function () {
  it('should queue tracks', async function () {
    const addToPlaylistScope = nock('https://api.spotify.com')
      .post('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .reply(200);

    const webScope = nock('https://slack.com')
      .post('/api/chat.postMessage', {
        text: '<@U1AAAAAAA> added *Test Me* by *Jme* to *My playlist*',
        channel: 'D1AAAAAAA'
      })
      .reply(200);

    const res = await chai
      .request(app)
      .post('/interactive')
      .send(require('../fixtures/findme_queue.json'));

    chai.assert.equal(res.text, 'Just a moment...');

    await new Promise(resolve =>
      webScope.on('replied', async () => {
        addToPlaylistScope.done();
        const activePlaylist = await Playlist.getActive();
        await activePlaylist.populate('tracks').execPopulate();
        const storedTracks = activePlaylist.tracks;

        chai.assert.include(storedTracks[2].toObject(), {
          spotifyID: '6sxosT7KMFP9OQL3DdD6Qy',
          requestedBy: 'U1AAAAAAA',
          artist: 'Jme',
          title: 'Test Me'
        });

        resolve();
      })
    );
  });

  it('should play tracks that are already in the playlist immediately', async function () {
    const getTracksScope = nock('https://api.spotify.com')
      .get('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .reply(200, require('../fixtures/playlist_tracks_3.json'));

    const addToPlaylistScope = nock('https://api.spotify.com')
      .post('/v1/users/U1AAAAAAA/playlists/P000000000000000000000/tracks')
      .reply(200);

    const playScope = nock('https://api.spotify.com')
      .put(
        '/v1/me/player/play',
        data =>
          data.context_uri ==
            'spotify:user:U1AAAAAAA:playlist:P000000000000000000000' &&
          data.offset.position == 1
      )
      .reply(200);

    const webScope = nock('https://slack.com')
      .post('/api/chat.postMessage', {
        text: 'Now playing *Psycho Killer - 2005 Remastered Version* by *Talking Heads*, as requested by <@U1AAAAAAA>',
        channel: 'D1AAAAAAA'
      })
      .reply(200);

    const res = await chai
      .request(app)
      .post('/interactive')
      .send(require('../fixtures/findme_play.json'));

    chai.assert.equal(res.text, 'Just a moment...');

    await new Promise(resolve =>
      webScope.on('replied', async () => {
        getTracksScope.done();
        chai.assert.isFalse(addToPlaylistScope.isDone());
        playScope.done();

        const activePlaylist = await Playlist.getActive();
        await activePlaylist.populate('tracks').execPopulate();
        chai.assert.equal(activePlaylist.tracks.length, 2);

        resolve();
      })
    );
  });
});
