#!/usr/bin/env python3
"""Minimal local HTTP server for Soup 2.4 and GdkPixbuf integration tests."""

import http.server
import struct
import sys
import zlib


def make_solid_png(width: int, height: int, rgb: tuple[int, int, int]) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    r, g, b = rgb
    raw_rows = b"".join(b"\x00" + bytes([r, g, b]) * width for _ in range(height))
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw_rows)) + chunk(b"IEND", b"")


PNG_BYTES = make_solid_png(4, 4, (40, 180, 90))


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/ok.json":
            body = b'{"ok": true}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/cover.png":
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Content-Length", str(len(PNG_BYTES)))
            self.end_headers()
            self.wfile.write(PNG_BYTES)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


def main() -> None:
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    port = server.server_address[1]
    print(f"HTTP_READY:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
