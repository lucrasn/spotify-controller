imports.gi.versions.Gtk = '4.0';
imports.gi.versions.Adw = '1';

const { Adw, Gio, GLib } = imports.gi;

const ROOT = GLib.getenv('REPO_ROOT');
const MOCK_DIR = `${ROOT}/tests/helpers/mock_gs`;

Adw.init();
imports.searchPath.unshift(MOCK_DIR, ROOT);

const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
    `${ROOT}/schemas`,
    Gio.SettingsSchemaSource.get_default(),
    false
);
const schema = schemaSource.lookup('org.gnome.shell.extensions.spotify-controller', true);
if (!schema)
    throw new Error('Could not find compiled GSettings schema');

const settings = Gio.Settings.new_full(schema, Gio.memory_settings_backend_new(), null);
imports.misc.extensionUtils._ext = { path: ROOT };
imports.misc.extensionUtils._settings = settings;

const prefs = imports.prefs;
if (typeof prefs.init !== 'function' || typeof prefs.fillPreferencesWindow !== 'function')
    throw new Error('prefs.js must export init() and fillPreferencesWindow()');

prefs.init();
const win = new Adw.PreferencesWindow();
prefs.fillPreferencesWindow(win);

// Exercise reactive bindings and widget updates across pages
settings.set_string('bg-mode', 'custom');
settings.set_string('custom-bg-color', '#123456');
settings.set_string('slider-style', 'straight');
settings.set_string('thumb-style', 'vertical');
settings.set_int('cover-art-radius', 170);
settings.set_string('custom-header-text', 'Test Header');
settings.set_string('custom-font-family', 'Sans');
settings.set_string('position', 'left');
settings.set_string('layout-order', 'buttons-end');

if (settings.get_string('custom-header-text') !== 'Test Header')
    throw new Error('GSettings header-text round-trip failed');

settings.reset('cover-art-radius');
settings.reset('custom-font-family');
settings.reset('custom-header-text');

win.destroy();
print('OK: test_prefs.js passed');
