<div align="center">

<img src="icons/logo.png" alt="Spotify Controller Logo" width="150" height="150">

# Spotify Controller

**Premium Spotify integration for GNOME Shell (GNOME 42 Backport Fork)**

A deeply customizable music player that lives in your panel - with ambient visuals, synced lyrics, smart playlists, and a glassmorphism UI adapted to run on **GNOME Shell 42**.

[![GNOME Shell](https://img.shields.io/badge/GNOME_Shell-42-4A86CF?style=flat-square&logo=gnome&logoColor=white)](#gnome-42-fork-changes)
[![License](https://img.shields.io/badge/License-GPL_3.0-green?style=flat-square)](LICENSE)
[![Upstream](https://img.shields.io/badge/Upstream-NarkAgni%2Fspotify--controller-555555?style=flat-square&logo=github)](https://github.com/NarkAgni/spotify-controller)

<br>

[GNOME 42 Changes](#gnome-42-fork-changes) · [Installation](#installation) · [Features](#features) · [Usage](#usage) · [Support](#support)

</div>

---

## Overview

Spotify Controller is a premium GNOME Shell extension that transforms your music experience. It brings a full-featured player directly into your desktop - complete with ambient album art backgrounds, real-time synchronized lyrics, a multi-playlist manager, and a glassmorphic UI that looks stunning against any wallpaper. Built for aesthetics, power, and zero friction.

> **Note:** This repository is a **GNOME Shell 42** fork of [NarkAgni/spotify-controller](https://github.com/NarkAgni/spotify-controller) (whose upstream release targets GNOME Shell 45–50).

### GNOME 42 Fork Changes

To make the extension compatible with GNOME Shell 42 (e.g., Ubuntu 22.04 LTS / GJS 1.72), the `gnome-42` branch includes the following backports:

- **Legacy GJS Modules & Lifecycle:** Converted ESM `import`/`export` syntax across all modules to `imports.*`, `Me.imports`, `ExtensionUtils`, and `init()` / `enable()` / `disable()` entrypoints (`metadata.json` updated to `"shell-version": ["42"]`).
- **libsoup 2.4 HTTP Client (`core/http.js`):** Replaced `libsoup 3.0` (`send_and_read_async`) with `libsoup 2.4` (`queue_message`) for fetching album art and `lrclib.net` synced lyrics.
- **Preferences UI (`libadwaita 1.1` / `GTK 4.6`):** Replaced newer widgets in `prefs.js` (`Adw.SwitchRow`, `Adw.EntryRow`, `Adw.ExpanderRow.add_suffix`, `Gtk.ColorDialogButton`, `Gtk.FontDialogButton`, and `new Gtk.StringList({ strings })`) with `GTK 4.6` / `libadwaita 1.1` equivalents (`Adw.ActionRow` + `Gtk.Switch`/`Gtk.Entry`, `add_action`, `Gtk.ColorButton`, `Gtk.FontButton`, and `Gtk.StringList.new`).
- **GNOME 42 Shell Compatibility:** Updated `St.ScrollView` child attachment to `add_actor()`, guarded `global.sync_pointer()`, added `Gio._promisify` for `Gio.File.prototype.read_async`, and disconnected `GSettings` signal handlers cleanly on `destroy()`.

<div align="center">
  <img src="media/panel.png" alt="Panel View" width="100%" style="border-radius: 10px; margin: 12px 0;">
  <sub>The Panel - Clean media controls integrated directly into GNOME Shell</sub>
</div>

<br>

<div align="center">
  <img src="media/popup.png" alt="Popup Player" width="48%" style="border-radius: 10px; margin: 12px 0;">
  <img src="media/lyrics.png" alt="Lyrics View" width="48%" style="border-radius: 10px; margin: 12px 0;">
  <sub>Popup Player with ambient art · Real-time synchronized lyrics overlay</sub>
</div>

<br>

<div align="center">
  <img src="media/playlist.png" alt="Playlist Manager" width="48%" style="border-radius: 10px; margin: 12px 0;">
  <img src="media/liked.png" alt="Liked Songs" width="48%" style="border-radius: 10px; margin: 12px 0;">
  <sub>Multi-Playlist Manager · Liked Songs collection</sub>
</div>

---

## Features

### Premium UI & Glassmorphism Design

A visual experience unlike any other GNOME extension.

- **Translucent Glass Look** - The popup, buttons, and lists all feature a sleek glassmorphic effect that adapts beautifully to light and dark wallpapers
- **Dynamic Ambient Background** - Dominant colors are extracted from the current track's cover art and applied as a live gradient across the popup
- **Spinning Cover Art** - Album art rotates like a vinyl record while music plays; speed and radius are fully adjustable in settings
- **Polished Hover Effects** - Every button and list item has smooth, custom hover states - YouTube Red on "Play All", Vibrant Purple on "Shuffle", Soft Red on the Heart icon

### Advanced Multi-Playlist Manager

A complete playlist system, built right into the extension.

- **Custom Playlists** - Create unlimited playlists, rename them on the fly with the edit icon, and delete them anytime
- **Quick Add** - Save the currently playing song to any playlist instantly with the `+` button on the main player page
- **Smart Search** - A search bar automatically appears once a list grows beyond 5 items, so you can filter fast
- **Track Intelligence** - Each playlist automatically displays its song count and total playback time (e.g., `5 songs • 19 min`)

> **Note:** Playlists are managed entirely by the extension and are independent of your Spotify account. Songs must be added and played from within the extension - if you change tracks directly in the Spotify app, the extension's playlist system will not reflect that change.

### Liked Songs System

Your favorites, always one tap away.

- **In-Player Heart Button** - A dedicated Heart icon next to the playback slider saves the current track to Liked Songs with a single click; the icon glows with a glassy soft-red color when active
- **Dedicated Liked Songs Page** - A separate section collects all your favorite tracks in one easy-to-access list

> **Note:** Liked Songs are stored locally by the extension and are separate from your Spotify account's saved library. Liking a song here won't sync to Spotify, and songs liked in the Spotify app won't appear here.

### Smart Playback & Queue Control

Full control over what plays and when.

- **Direct Play** - Clicking any song in a playlist or Liked Songs instantly triggers playback in Spotify
- **Play All & Shuffle** - Every playlist has dedicated action buttons at the top to play in order or at random
- **Full Media Controls** - Play, Pause, Next, Previous, and Repeat, all wired up and ready
- **Smooth Seek Slider** - A buttery-smooth progress slider lets you seek precisely through any track

### Real-Time Synchronized Lyrics

One click to sing along.

- **One-Click Overlay** - Tap the cover art to instantly transition to a synchronized lyrics view; tap again to return
- **Auto-Scroll** - Lyrics scroll automatically in sync with the track's current timestamp - no manual interaction needed

### Smart Backend & Optimization

Fast, lean, and built to last.

- **Offline Data** - All custom playlists and liked songs are saved locally in a `spotify-playlist.json` file - no cloud dependency
- **Image Caching** - Cover art is cached to a `.cache` folder after the first download, saving bandwidth and reducing RAM usage on every subsequent play
- **Auto Garbage Collector** - Old, unused cached images are silently purged over time, keeping your storage clean

### Deep Customization

Open the Spotify Controller preferences to fine-tune everything:

- Customize fonts, font sizes, and text colors
- Adjust button spacing, margins, and icon sizes
- Toggle the vinyl rotation animation for cover art
- Choose between **Wavy** or **Straight** progress slider styles with custom thickness, speed, and colors
- Reposition the panel widget to the Left, Center, or Right side
- Show or hide individual panel buttons independently

---

## Usage

| Action | How |
|--------|-----|
| Play / Pause | Click the panel button or use the popup |
| Next / Previous | Panel buttons or popup controls |
| Adjust Volume | Mouse wheel scroll on the panel widget |
| Seek through track | Click and drag the progress slider |
| View Lyrics | Click the album art in the popup |
| Like current song | Click the Heart icon next to the slider |
| Manage playlists | Open the popup → navigate to Playlists |

---

## Installation

> **GNOME Extensions Website:** The [official listing on GNOME Extensions](https://extensions.gnome.org/extension/9315/spotify-controller/) is maintained upstream for **GNOME Shell 45–50** and will not load on GNOME 42. Use the source installation below for this fork.

### From Source

**Requirements:** GNOME Shell 42 · `libglib2.0-bin` · `gir1.2-soup-2.4` · `gir1.2-adw-1` · `gir1.2-gtk-4.0` · Spotify (App or Web Player)

```bash
# 1. Clone this fork (gnome-42 branch)
git clone -b gnome-42 https://github.com/lucrasn/spotify-controller.git
cd spotify-controller

# 2. Install
make install

# 3. Restart GNOME Shell
#    On X11:     Press Alt+F2, type 'r', press Enter
#    On Wayland: Log out and back in

# 4. Enable the extension
gnome-extensions enable spotify-controller@narkagni
```

---

## Support

Spotify Controller is free and open-source. If it enhances your music experience, consider supporting development:

<div align="center">

[![Sponsor on GitHub](https://img.shields.io/badge/❤️_Sponsor-NarkAgni-EA4AAA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/NarkAgni)
&nbsp;
[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_a_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/narkagni)

</div>

<details>
<summary><b>Crypto donations</b></summary>

<br>

| Network | Address |
|---------|---------|
| Bitcoin (BTC) | `1GSHkxfhYjk1Qe4AQSHg3aRN2jg2GQWAcV` |
| Ethereum (ETH) | `0xf43c3f83e53495ea06676c0d9d4fc87ce627ffa3` |
| Tether USDT (TRC20) | `THnqG9nchLgaf1LzGK3CqdmNpRxw59hs82` |

</details>

---

<div align="center">

Made with ❤️ by **[NarkAgni](https://github.com/NarkAgni)** · GPL-3.0

GNOME 42 backport maintained in **[lucrasn/spotify-controller](https://github.com/lucrasn/spotify-controller)**

</div>