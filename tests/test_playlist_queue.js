const { GLib } = imports.gi;

const ROOT = GLib.getenv('REPO_ROOT');
const MOCK_DIR = `${ROOT}/tests/helpers/mock_gs`;

imports.searchPath.unshift(MOCK_DIR, ROOT);

const { PlaylistManager } = imports.core.playlist;
const { QueueManager } = imports.core.queueManager;

function assert(cond, msg) {
    if (!cond)
        throw new Error(`Assertion failed: ${msg}`);
}

// PlaylistManager persistence and CRUD integration test
const pm1 = new PlaylistManager();
assert(pm1.getPlaylistNames().includes('My Playlist'), 'default playlist exists');
assert(pm1.createPlaylist('Chill'), 'createPlaylist Chill');
assert(!pm1.createPlaylist('Chill'), 'duplicate playlist rejected');
assert(!pm1.createPlaylist('   '), 'empty playlist rejected');

const track1 = {
    trackId: '/com/spotify/track/abc123',
    title: 'Song One',
    artist: 'Artist A',
    length: 185000000,
};
const track2 = {
    trackId: 'spotify:track:def456',
    title: 'Song Two',
    artist: 'Artist B',
    length: 210000000,
};

assert(pm1.addTrack('Chill', track1), 'addTrack track1');
assert(!pm1.addTrack('Chill', track1), 'duplicate track rejected');
assert(pm1.addTrack('Chill', track2), 'addTrack track2');
assert(pm1.getTracks('Chill')[0].spotifyUri === 'spotify:track:abc123', 'URI normalized');
assert(pm1.getTracks('Chill')[0].duration === 185, 'duration converted to seconds');
assert(pm1.renamePlaylist('Chill', 'Focus'), 'renamePlaylist works');
assert(pm1.toggleLike(track1) === true, 'toggleLike adds track');
assert(pm1.isLiked(track1) === true, 'isLiked true after like');

// Reload from disk in fresh instance
const pm2 = new PlaylistManager();
assert(pm2.getPlaylistNames().includes('Focus'), 'renamed playlist persisted');
assert(pm2.getTracks('Focus').length === 2, 'tracks persisted');
assert(pm2.isLiked(track1) === true, 'liked songs persisted');

pm2.removeTrack('Focus', 'spotify:track:abc123');
assert(pm2.getTracks('Focus').length === 1, 'removeTrack removes track');
pm2.deletePlaylist('Focus');
assert(!pm2.getPlaylistNames().includes('Focus'), 'deletePlaylist removes playlist');
pm2.removeLiked('spotify:track:abc123');
assert(!pm2.isLiked(track1), 'removeLiked removes liked track');

// QueueManager integration test
const played = [];
const qm1 = new QueueManager((uri) => played.push(uri));
const tracks = [
    { id: 'spotify:track:t1', spotifyUri: '/com/spotify/track/t1', title: 'T1', artist: 'A' },
    { id: 'spotify:track:t2', spotifyUri: 'spotify:track:t2', title: 'T2', artist: 'B' },
    { id: 'spotify:track:t3', spotifyUri: 'spotify:track:t3', title: 'T3', artist: 'C' },
];

qm1.startQueue(tracks, false);
assert(qm1.isActive === true, 'queue active after startQueue');
assert(played[0] === 'spotify:track:t1', 'first track normalized and played');

assert(qm1.next() === true, 'next advances');
assert(played[1] === 'spotify:track:t2', 'second track played');

assert(qm1.prev() === true, 'prev goes back');
assert(played[2] === 'spotify:track:t1', 'back to first track');

qm1.toggleRepeat();
assert(qm1.repeatMode === 'Track', 'repeat cycles Playlist -> Track');
qm1.toggleRepeat();
assert(qm1.repeatMode === 'None', 'repeat cycles Track -> None');
assert(qm1.prev() === true && qm1.currentIndex === 0, 'prev clamps at 0 in None mode');

qm1.toggleShuffle();
assert(qm1.shuffleMode === true, 'shuffle toggled on');
assert(qm1.tracks[qm1.currentIndex].id === 'spotify:track:t1', 'current track stays at index 0');

// Reload queue state from disk
const qm2 = new QueueManager((uri) => played.push(uri));
assert(qm2.isActive === true, 'queue active state persisted');
assert(qm2.tracks.length === 3, 'queue tracks persisted');

// Simulate near-end natural transition
qm2.transitionEndTime = 0;
qm2.checkTrackChange('/com/spotify/track/t1', 99000000, 100000000);
assert(qm2.wasNearEnd === true, 'wasNearEnd set near end of track');
const beforeLen = played.length;
qm2.checkTrackChange('spotify:track:external', 0, 100000000);
assert(played.length === beforeLen + 1, 'auto-advanced on track end transition');

// External manual skip stops queue
qm2.transitionEndTime = 0;
qm2.wasNearEnd = false;
qm2.checkTrackChange('spotify:track:unrelated', 5000000, 100000000);
assert(qm2.isActive === false, 'external track change stops queue');

print('OK: test_playlist_queue.js passed');
