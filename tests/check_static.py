#!/usr/bin/env python3
"""Static, schema, packaging, and target-compatibility checks for Spotify Controller."""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def check_metadata() -> tuple[dict, str]:
    meta_path = ROOT / "metadata.json"
    if not meta_path.is_file():
        fail("metadata.json not found")

    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"metadata.json is invalid JSON: {exc}")

    for key in ("uuid", "name", "description", "settings-schema", "shell-version"):
        if key not in meta or not meta[key]:
            fail(f"metadata.json missing required key: {key}")

    versions = meta["shell-version"]
    if not isinstance(versions, list) or not all(isinstance(v, str) for v in versions):
        fail("metadata.json shell-version must be a non-empty list of strings")

    target = "gnome-42" if any(v.startswith("42") for v in versions) else "gnome-45+"
    print(f"OK: metadata.json valid (uuid={meta['uuid']}, target={target}, shell-version={versions})")
    return meta, target


def check_schema(meta: dict) -> set[str]:
    schemas_dir = ROOT / "schemas"
    xml_files = list(schemas_dir.glob("*.gschema.xml"))
    if not xml_files:
        fail("No .gschema.xml file found in schemas/")

    schema_ids = set()
    schema_keys: set[str] = set()
    for xml_file in xml_files:
        try:
            tree = ET.parse(xml_file)
        except ET.ParseError as exc:
            fail(f"Invalid XML in {xml_file}: {exc}")
        root = tree.getroot()
        for schema_el in root.findall("schema"):
            sid = schema_el.attrib.get("id")
            if sid:
                schema_ids.add(sid)
            for key_el in schema_el.findall("key"):
                kname = key_el.attrib.get("name")
                if kname:
                    schema_keys.add(kname)

    expected_schema = meta["settings-schema"]
    if expected_schema not in schema_ids:
        fail(f"metadata.json settings-schema '{expected_schema}' not found in {schema_ids}")

    res = subprocess.run(
        ["glib-compile-schemas", "--strict", str(schemas_dir)],
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        fail(f"glib-compile-schemas --strict failed:\n{res.stderr}{res.stdout}")

    # Verify all referenced GSettings keys exist in the compiled schema
    key_patterns = [
        re.compile(r"""settings\.(?:get|set)_(?:string|int|boolean|double|value)\(\s*['"]([a-z0-9-]+)['"]"""),
        re.compile(r"""settings\.(?:bind|reset)\(\s*['"]([a-z0-9-]+)['"]"""),
        re.compile(r"""settings\.connect\(\s*['"]changed::([a-z0-9-]+)['"]"""),
    ]
    missing_keys = []
    for js_file in sorted(ROOT.glob("*.js")) + sorted((ROOT / "ui").glob("*.js")) + sorted((ROOT / "core").glob("*.js")):
        text = js_file.read_text(encoding="utf-8")
        for pat in key_patterns:
            for match in pat.finditer(text):
                k = match.group(1)
                if k not in schema_keys:
                    missing_keys.append((js_file.relative_to(ROOT), k))

    if missing_keys:
        fail(f"Referenced GSettings keys missing from schema: {missing_keys}")

    print(f"OK: schema valid ({len(schema_keys)} keys verified against JS references)")
    return schema_keys


def check_css() -> None:
    css_path = ROOT / "stylesheet.css"
    if not css_path.is_file():
        fail("stylesheet.css not found")
    css = css_path.read_text(encoding="utf-8")
    if not css.strip():
        fail("stylesheet.css is empty")
    depth = 0
    for ch in css:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth < 0:
                fail("stylesheet.css has unmatched '}'")
    if depth != 0:
        fail("stylesheet.css has unclosed '{'")
    print("OK: stylesheet.css brace balance verified")


def check_packaging(meta: dict) -> None:
    uuid = meta["uuid"]
    with tempfile.TemporaryDirectory() as tmp_home:
        env = os.environ.copy()
        env["HOME"] = tmp_home
        res = subprocess.run(["make", "install"], cwd=ROOT, env=env, capture_output=True, text=True)
        if res.returncode != 0:
            fail(f"make install failed:\n{res.stdout}\n{res.stderr}")

        installed = Path(tmp_home) / ".local/share/gnome-shell/extensions" / uuid
        required = [
            "extension.js",
            "prefs.js",
            "stylesheet.css",
            "metadata.json",
            "icons/logo.png",
            "schemas/gschemas.compiled",
        ]
        for rel in required:
            if not (installed / rel).exists():
                fail(f"make install missing expected file: {rel}")

        for forbidden in (".github", "tests", "README.md", "Makefile"):
            if (installed / forbidden).exists():
                fail(f"make install leaked non-runtime path: {forbidden}")

        if not list((installed / "core").glob("*.js")) or not list((installed / "ui").glob("*.js")):
            fail("make install missing core/*.js or ui/*.js")

    zip_path = ROOT / f"{uuid}.zip"
    if zip_path.exists():
        zip_path.unlink()
    try:
        res = subprocess.run(["make", "pack"], cwd=ROOT, capture_output=True, text=True)
        if res.returncode != 0:
            fail(f"make pack failed:\n{res.stdout}\n{res.stderr}")
        if not zip_path.is_file():
            fail(f"make pack did not create {zip_path.name}")
        with zipfile.ZipFile(zip_path) as zf:
            names = set(zf.namelist())
            for req in ("extension.js", "prefs.js", "metadata.json", "stylesheet.css", "schemas/gschemas.compiled"):
                if req not in names:
                    fail(f"make pack archive missing {req}")
            for name in names:
                if name.startswith(("tests/", ".github/", "media/")):
                    fail(f"make pack archive should exclude {name}")
    finally:
        if zip_path.exists():
            zip_path.unlink()

    print("OK: make install & make pack integrity verified")


def check_js_for_target(target: str) -> None:
    js_files = sorted(ROOT.glob("*.js")) + sorted((ROOT / "core").glob("*.js")) + sorted((ROOT / "ui").glob("*.js"))
    if not js_files:
        fail("No JS files found")

    if target == "gnome-45+":
        node = shutil.which("node")
        if not node:
            fail("node is required to check ESM syntax on gnome-45+ target")
        for f in js_files:
            res = subprocess.run(
                [node, "--input-type=module", "--check"],
                input=f.read_text(encoding="utf-8"),
                capture_output=True,
                text=True,
            )
            if res.returncode != 0:
                fail(f"ESM syntax check failed for {f.relative_to(ROOT)}:\n{res.stderr}")
        print(f"OK: all {len(js_files)} JS files passed ESM syntax check (target={target})")
        return

    # target == "gnome-42": enforce strict GNOME 42 backport invariants
    esm_re = re.compile(r"^\s*(?:import|export)\b", re.MULTILINE)
    forbidden_apis = [
        (re.compile(r"\bAdw\.(?:SwitchRow|EntryRow)\b"), "Adw.SwitchRow/EntryRow unavailable in libadwaita 1.1"),
        (re.compile(r"\bGtk\.(?:ColorDialog|ColorDialogButton|FontDialog|FontDialogButton)\b"), "GTK 4.10+ dialog unavailable in GTK 4.6"),
        (re.compile(r"new\s+Gtk\.StringList\s*\(\s*\{"), "Use Gtk.StringList.new([...]) on GTK 4.6"),
        (re.compile(r"\.add_suffix\(\s*createGroupReset"), "Adw.ExpanderRow uses add_action() in libadwaita 1.1"),
        (re.compile(r"[A-Za-z0-9_]*ScrollView\.set_child\("), "Use add_actor() on St.ScrollView in GNOME 42"),
        (re.compile(r"send_and_read_async"), "send_and_read_async is Soup 3.0 only"),
        (re.compile(r"var\(--"), "CSS custom properties var(--...) unsupported in GNOME 42 St CSS"),
    ]

    for f in js_files:
        text = f.read_text(encoding="utf-8")
        rel = f.relative_to(ROOT)
        if esm_re.search(text):
            fail(f"Leftover ESM import/export found in {rel}")
        for pat, reason in forbidden_apis:
            if pat.search(text):
                fail(f"GNOME 42 incompatibility in {rel}: {reason}")

    # Verify global.sync_pointer is guarded if present
    playlist_ui = (ROOT / "ui/playlistUI.js").read_text(encoding="utf-8")
    for line in playlist_ui.splitlines():
        if "global.sync_pointer()" in line and "typeof global.sync_pointer" not in line and "_syncPointer" not in playlist_ui:
            fail("Unguarded global.sync_pointer() call in ui/playlistUI.js")

    print(f"OK: all {len(js_files)} JS files passed GNOME 42 static compatibility checks")


def main() -> None:
    meta, target = check_metadata()
    check_schema(meta)
    check_css()
    check_packaging(meta)
    check_js_for_target(target)
    print(f"TARGET={target}")


if __name__ == "__main__":
    main()
