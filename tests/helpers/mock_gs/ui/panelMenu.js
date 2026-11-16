const { GObject, St } = imports.gi;

var Button = GObject.registerClass(
    class MockPanelMenuButton extends St.Widget {
        _init() {
            super._init();
        }
    }
);
