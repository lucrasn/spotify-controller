const { Gio, GLib } = imports.gi;

const ROOT = GLib.getenv('REPO_ROOT');
const STATE_FILE = GLib.getenv('MPRIS_STATE_FILE');
const MOCK_DIR = `${ROOT}/tests/helpers/mock_gs`;

imports.searchPath.unshift(MOCK_DIR, ROOT);
const extObj = { path: ROOT, imports: { core: imports.core } };
imports.misc.extensionUtils._ext = extObj;

const { SpotifyProxy } = imports.core.spotifyProxy;

function assert(cond, msg) {
    if (!cond)
        throw new Error(`Assertion failed: ${msg}`);
}

const loop = new GLib.MainLoop(null, false);
let seekedPos = null;

async function run() {
    const proxy = new SpotifyProxy(() => {});
    await proxy.init();
    proxy.onSeeked((pos) => {
        seekedPos = pos;
    });

    const info = proxy.getInfo();
    assert(info !== null, 'SpotifyProxy.getInfo() returned data');
    assert(info.title === 'Test Track', `title expected 'Test Track', got '${info.title}'`);
    assert(info.artist === 'Test Artist', `artist expected 'Test Artist', got '${info.artist}'`);
    assert(info.album === 'Test Album', `album expected 'Test Album', got '${info.album}'`);
    assert(info.length === 200000000, 'length matches');

    const ctrl = proxy.controls();
    ctrl.playPause();
    ctrl.next();
    ctrl.previous();
    ctrl.seek(0.5);
    proxy.toggleShuffle();
    proxy.toggleRepeat();
    proxy.changeVolume(-0.2);

    // Allow D-Bus async calls and Seeked signal to arrive
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
        try {
            const f = Gio.File.new_for_path(STATE_FILE);
            const [, raw] = f.load_contents(null);
            const state = JSON.parse(new TextDecoder('utf-8').decode(raw));
            const calls = state.calls || [];

            assert(calls.includes('PlayPause'), 'PlayPause received over D-Bus');
            assert(calls.includes('Next'), 'Next received over D-Bus');
            assert(calls.includes('Previous'), 'Previous received over D-Bus');
            assert(calls.includes('SetPosition:/com/spotify/track/test123:100000000'), `SetPosition received: ${calls}`);
            assert(seekedPos === 100000000, `Seeked signal received (got ${seekedPos})`);
            assert(calls.some(c => c.startsWith('SetShuffle:True')), `SetShuffle received: ${calls}`);
            assert(calls.some(c => c.startsWith('SetLoopStatus:Playlist')), `SetLoopStatus received: ${calls}`);
            assert(calls.some(c => c.startsWith('SetVolume:0.60')), `SetVolume received: ${calls}`);

            proxy.destroy();
            print('OK: test_mpris_integration.js passed');
            loop.quit();
        } catch (e) {
            printerr(e);
            loop.quit();
            imports.system.exit(1);
        }
        return GLib.SOURCE_REMOVE;
    });
}

run().catch((e) => {
    printerr(e);
    loop.quit();
    imports.system.exit(1);
});

loop.run();
