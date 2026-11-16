const { Gio, GLib } = imports.gi;

const ROOT = GLib.getenv('REPO_ROOT');
const MOCK_DIR = `${ROOT}/tests/helpers/mock_gs`;

imports.searchPath.unshift(MOCK_DIR, ROOT);

// 1. Parse syntax of every JS file under GJS 1.72
const jsFiles = [
    'extension.js',
    'prefs.js',
    'core/http.js',
    'core/LyricsClient.js',
    'core/mprisClient.js',
    'core/playlist.js',
    'core/queueManager.js',
    'core/spotifyProxy.js',
    'ui/LyricsWidget.js',
    'ui/slider.js',
    'ui/playlistUI.js',
    'ui/popup.js',
    'ui/panel.js',
];

for (const rel of jsFiles) {
    const file = Gio.File.new_for_path(`${ROOT}/${rel}`);
    const [, bytes] = file.load_contents(null);
    const code = new TextDecoder('utf-8').decode(bytes);
    new Function(code);
}

// 2. Verify all extension module imports and exported symbols against local Shell typelibs
const extObj = {
    path: ROOT,
    imports: {
        core: imports.core,
        ui: imports.ui,
    },
};
imports.misc.extensionUtils._ext = extObj;

const expectedExports = [
    ['core/http.httpGet', extObj.imports.core.http.httpGet],
    ['core/mprisClient.MprisClient', extObj.imports.core.mprisClient.MprisClient],
    ['core/playlist.PlaylistManager', extObj.imports.core.playlist.PlaylistManager],
    ['core/queueManager.QueueManager', extObj.imports.core.queueManager.QueueManager],
    ['core/LyricsClient.LyricsClient', extObj.imports.core.LyricsClient.LyricsClient],
    ['core/spotifyProxy.SpotifyProxy', extObj.imports.core.spotifyProxy.SpotifyProxy],
    ['ui/LyricsWidget.LyricsWidget', extObj.imports.ui.LyricsWidget.LyricsWidget],
    ['ui/slider.MediaSlider', extObj.imports.ui.slider.MediaSlider],
    ['ui/playlistUI.PlaylistUI', extObj.imports.ui.playlistUI.PlaylistUI],
    ['ui/popup.MediaPopup', extObj.imports.ui.popup.MediaPopup],
    ['ui/panel.MediaIndicator', extObj.imports.ui.panel.MediaIndicator],
    ['extension.init', imports.extension.init],
];

for (const [name, sym] of expectedExports) {
    if (typeof sym !== 'function')
        throw new Error(`Missing or non-function export: ${name} (got ${typeof sym})`);
}

print('OK: test_shell_modules.js passed');
