#!/usr/bin/env python3
"""Minimal mock org.mpris.MediaPlayer2.spotify D-Bus service for integration tests."""

import json
import os
import signal
import sys
from gi.repository import Gio, GLib

INTROSPECTION_XML = """
<node>
  <interface name="org.mpris.MediaPlayer2.Player">
    <method name="PlayPause"/>
    <method name="Next"/>
    <method name="Previous"/>
    <method name="SetPosition">
      <arg type="o" name="TrackId" direction="in"/>
      <arg type="x" name="Position" direction="in"/>
    </method>
    <signal name="Seeked">
      <arg type="x" name="Position"/>
    </signal>
    <property name="Metadata" type="a{sv}" access="read"/>
    <property name="PlaybackStatus" type="s" access="read"/>
    <property name="Volume" type="d" access="readwrite"/>
    <property name="LoopStatus" type="s" access="readwrite"/>
    <property name="Shuffle" type="b" access="readwrite"/>
    <property name="Position" type="x" access="read"/>
  </interface>
</node>
"""


class MockSpotifyMpris:
    def __init__(self, state_file: str):
        self.state_file = state_file
        self.calls: list[str] = []
        self.status = "Playing"
        self.volume = 0.8
        self.loop_status = "None"
        self.shuffle = False
        self.position = 15_000_000
        self.metadata = {
            "mpris:trackid": GLib.Variant("o", "/com/spotify/track/test123"),
            "xesam:title": GLib.Variant("s", "Test Track"),
            "xesam:artist": GLib.Variant("as", ["Test Artist"]),
            "xesam:album": GLib.Variant("s", "Test Album"),
            "mpris:artUrl": GLib.Variant("s", "https://example.invalid/art.jpg"),
            "mpris:length": GLib.Variant("x", 200_000_000),
        }
        self._node_info = Gio.DBusNodeInfo.new_for_xml(INTROSPECTION_XML)
        self._conn = None

    def _save_state(self) -> None:
        with open(self.state_file, "w", encoding="utf-8") as fh:
            json.dump(
                {
                    "calls": self.calls,
                    "status": self.status,
                    "volume": self.volume,
                    "loop_status": self.loop_status,
                    "shuffle": self.shuffle,
                    "position": self.position,
                },
                fh,
            )

    def _on_method_call(self, conn, sender, obj_path, iface, method, params, invocation):
        if method == "PlayPause":
            self.calls.append("PlayPause")
            self.status = "Paused" if self.status == "Playing" else "Playing"
        elif method == "Next":
            self.calls.append("Next")
        elif method == "Previous":
            self.calls.append("Previous")
        elif method == "SetPosition":
            track_id, pos = params.unpack()
            self.calls.append(f"SetPosition:{track_id}:{pos}")
            self.position = pos
            conn.emit_signal(
                None,
                "/org/mpris/MediaPlayer2",
                "org.mpris.MediaPlayer2.Player",
                "Seeked",
                GLib.Variant("(x)", (pos,)),
            )
        self._save_state()
        invocation.return_value(None)

    def _on_get_property(self, conn, sender, obj_path, iface, prop):
        if prop == "Metadata":
            return GLib.Variant("a{sv}", self.metadata)
        if prop == "PlaybackStatus":
            return GLib.Variant("s", self.status)
        if prop == "Volume":
            return GLib.Variant("d", self.volume)
        if prop == "LoopStatus":
            return GLib.Variant("s", self.loop_status)
        if prop == "Shuffle":
            return GLib.Variant("b", self.shuffle)
        if prop == "Position":
            return GLib.Variant("x", self.position)
        return None

    def _on_set_property(self, conn, sender, obj_path, iface, prop, value):
        if prop == "Volume":
            self.volume = value.get_double()
            self.calls.append(f"SetVolume:{self.volume:.2f}")
        elif prop == "LoopStatus":
            self.loop_status = value.get_string()
            self.calls.append(f"SetLoopStatus:{self.loop_status}")
        elif prop == "Shuffle":
            self.shuffle = value.get_boolean()
            self.calls.append(f"SetShuffle:{self.shuffle}")
        self._save_state()
        return True

    def on_bus_acquired(self, conn, name):
        self._conn = conn
        conn.register_object(
            "/org/mpris/MediaPlayer2",
            self._node_info.interfaces[0],
            self._on_method_call,
            self._on_get_property,
            self._on_set_property,
        )

    def on_name_acquired(self, conn, name):
        self._save_state()
        print("MPRIS_READY", flush=True)


def main() -> None:
    state_file = sys.argv[1]
    service = MockSpotifyMpris(state_file)
    loop = GLib.MainLoop()

    signal.signal(signal.SIGTERM, lambda *_: loop.quit())
    signal.signal(signal.SIGINT, lambda *_: loop.quit())

    Gio.bus_own_name(
        Gio.BusType.SESSION,
        "org.mpris.MediaPlayer2.spotify",
        Gio.BusNameOwnerFlags.NONE,
        service.on_bus_acquired,
        service.on_name_acquired,
        lambda *_: loop.quit(),
    )
    loop.run()


if __name__ == "__main__":
    main()
