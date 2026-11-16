const { GObject, St } = imports.gi;

var PopupBaseMenuItem = GObject.registerClass(
    class MockPopupBaseMenuItem extends St.BoxLayout {
        _init() {
            super._init();
        }
    }
);
