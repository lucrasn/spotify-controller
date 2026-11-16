try {
    imports.gi.versions.Soup = '2.4';
} catch (_) {}

const { GLib, Gio, Soup, GdkPixbuf } = imports.gi;

const ROOT = GLib.getenv('REPO_ROOT');
const HTTP_BASE = GLib.getenv('TEST_HTTP_BASE');
const TMP_DIR = GLib.getenv('TEST_TMP_DIR');
const MOCK_DIR = `${ROOT}/tests/helpers/mock_gs`;

imports.searchPath.unshift(MOCK_DIR, ROOT);
const extObj = { path: ROOT, imports: { core: imports.core } };
imports.misc.extensionUtils._ext = extObj;

const { httpGet } = imports.core.http;
const { LyricsClient } = imports.core.LyricsClient;

function assert(cond, msg) {
    if (!cond)
        throw new Error(`Assertion failed: ${msg}`);
}

// 1. LyricsClient LRC parser integration check
const lc = new LyricsClient();
const parsed = lc._parseLRC('[00:12.50] First line\n[01:02.123] Second line\n[01:10.00]   \nInvalid line');
assert(parsed.length === 2, `expected 2 parsed LRC lines, got ${parsed.length}`);
assert(parsed[0].time === 12500 && parsed[0].text === 'First line', '2-digit centisecond parsed');
assert(parsed[1].time === 62123 && parsed[1].text === 'Second line', '3-digit millisecond parsed');
lc.destroy();

// 2. Soup 2.4 httpGet + GdkPixbuf local server integration check
const session = new Soup.Session({ timeout: 5, user_agent: 'SpotifyControllerTest/1.0' });
const loop = new GLib.MainLoop(null, false);

async function run() {
    const jsonRes = await httpGet(session, `${HTTP_BASE}/ok.json`);
    assert(jsonRes.statusCode === Soup.Status.OK, `expected 200, got ${jsonRes.statusCode}`);
    const obj = JSON.parse(new TextDecoder('utf-8').decode(jsonRes.data));
    assert(obj.ok === true, 'JSON body decoded via Soup 2.4');

    const missRes = await httpGet(session, `${HTTP_BASE}/missing`);
    assert(missRes.statusCode === Soup.Status.NOT_FOUND, `expected 404, got ${missRes.statusCode}`);

    const imgRes = await httpGet(session, `${HTTP_BASE}/cover.png`);
    assert(imgRes.statusCode === Soup.Status.OK, `expected 200 for image, got ${imgRes.statusCode}`);

    const imgFile = Gio.File.new_for_path(`${TMP_DIR}/cover.png`);
    const [ok] = imgFile.replace_contents(imgRes.data, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
    assert(ok, 'image saved to disk');

    const pixbuf = GdkPixbuf.Pixbuf.new_from_file(imgFile.get_path());
    const scaled = pixbuf.scale_simple(1, 1, GdkPixbuf.InterpType.TILES);
    const px = scaled.get_pixels();
    assert(px[0] === 40 && px[1] === 180 && px[2] === 90, `unexpected RGB (${px[0]},${px[1]},${px[2]})`);

    session.abort();
    print('OK: test_http_and_lyrics.js passed');
}

run()
    .catch((e) => {
        printerr(e);
        imports.system.exit(1);
    })
    .finally(() => loop.quit());

loop.run();
