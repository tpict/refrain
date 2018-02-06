require('../setup');

const chai = require('chai');

const Playlist = require('../../src/models/playlist');

require('../../src/app');

describe('Playlist model', function () {
  it('should only allow one active playlist at a time', async function () {
    const playlist = new Playlist({
      spotifyID: 'P000000000000000000001',
      spotifyUserID: 'U1AAAAAAA',
      name: 'Another playlist',
      active: false
    });
    await playlist.save();
    chai.assert.equal(await Playlist.find({}).count(), 2);

    const playlist2 = new Playlist({
      spotifyID: 'P000000000000000000002',
      spotifyUserID: 'U1AAAAAAA',
      name: 'Yet another playlist',
      active: true
    });

    try {
      await playlist2.save();
    } catch (err) {
      // Rejected by pre-save hook
      return;
    }

    chai.assert.fail(
      'Playlist pre-save hook did not reject a second active playlist'
    );
  });

  it('should enforce that the first playlist is made active', async function () {
    await Playlist.remove({});
    const playlist = new Playlist({
      spotifyID: 'P000000000000000000001',
      spotifyUserID: 'U1AAAAAAA',
      name: 'Another playlist',
      active: false
    });

    try {
      await playlist.save();
    } catch (err) {
      // Rejected by pre-save hook
      return;
    }

    chai.assert.fail(
      'Playlist pre-save hook did not reject inactive first playlist'
    );
  });

  it('should disallow the only active playlist from becoming inactive', async function () {
    const playlist = await Playlist.getActive();
    playlist.active = false;

    try {
      await playlist.save();
    } catch (err) {
      // Rejected by pre-save hook
      return;
    }

    chai.assert.fail(
      'Playlist pre-save hook did not prevent only playlist becoming inactive'
    );
  });

  it('should make another playlist active on deletion', async function () {
    await new Playlist({
      spotifyID: 'P000000000000000000001',
      spotifyUserID: 'U1AAAAAAA',
      name: 'Another playlist',
      active: false
    }).save();

    const playlist = await Playlist.getActive();
    await playlist.remove();

    const newActivePlaylist = await Playlist.getActive();
    chai.assert.equal(newActivePlaylist.spotifyID, 'P000000000000000000001');
    newActivePlaylist.remove({});
  });
});
