<div align="center">

# MovieBox-TUI

**Terminal interface to find, download, and stream movies, TV shows, and live TV using local media players.**

[ English ](README.md) • [ বাংলা ](README_BN.md) • [ हिन्दी ](README_HI.md) • [ Español ](README_ES.md)

[![CI](https://img.shields.io/github/actions/workflow/status/mesamirh/MovieBox-Tui/ci.yml?branch=main&label=CI&logo=github&style=flat)](https://github.com/mesamirh/MovieBox-Tui/actions/workflows/ci.yml)
[![crates.io](https://img.shields.io/crates/v/moviebox-tui.svg?logo=rust&style=flat)](https://crates.io/crates/moviebox-tui)
[![License](https://img.shields.io/badge/license-MIT%2FApache--2.0-blue.svg?style=flat)](#license)
[![Telegram](https://img.shields.io/badge/Telegram-Channel-2CA5E0?style=flat&logo=telegram&logoColor=white)](https://t.me/getfromme)
[![Support](https://img.shields.io/badge/Support-Crypto-F7931A?style=flat&logo=bitcoin&logoColor=white)](#optional-support)
</div>

[moviebox-tui-walkthrough.webm](https://github.com/user-attachments/assets/7554a7e5-6ff5-49ec-9d87-f821ea99950e)

## Features

- **Streaming:** Movies, TV series, anime, Asian dramas, and community Stremio addons across multiple native providers.
- **Live TV:** M3U playlist import with channel categories, EPG support, and search.
- **Resolution Picker:** Direct stream quality selection (`4K`, `1080p`, `720p`, `480p`, `Auto`) before playback.
- **Hardware Players:** Direct launch in `mpv`, `VLC`, or `IINA` with custom auth header and cookie forwarding.
- **Batch Downloader:** Multi-segment concurrent downloader with HTTP range pause and resume for episodes and full seasons.
- **Subtitle Picker:** Multi-language subtitle tracks extracted and selectable via an interactive picker before playback or download.
- **Terminal UI:** Vim navigation, mouse interaction, slash command palette (`/help`, `/settings`), and 9 built-in themes.
- **Cover Art:** Native Kitty, Sixel, and iTerm2 poster rendering with automatic text fallback.
- **Resume & Library:** Home deck with continue-watching timestamps, watch history, and favorites stored strictly on local disk. Zero telemetry.

## Prerequisites

- **Media Player:** `mpv`, `VLC`, or `IINA` (macOS) / any external video player (Android).
- **Posters:** Terminal with Sixel, Kitty, or iTerm2 support (Ghostty, Kitty, WezTerm, iTerm2, foot, Windows Terminal v1.22+).
- **DASH Downloads:** `yt-dlp` and `ffmpeg` (required only for MovieBox DASH downloads).

## Installation

### macOS & Linux

If you have [Homebrew](https://brew.sh/) on macOS:
```bash
brew tap mesamirh/moviebox-tui https://github.com/mesamirh/MovieBox-Tui
brew install moviebox-tui
```

> **Note:** If Homebrew prompts for tap verification on initial install, run `brew trust mesamirh/moviebox-tui`.

Direct install via Terminal (macOS & Linux, no package manager needed):
```bash
curl -fsSL https://raw.githubusercontent.com/mesamirh/MovieBox-Tui/main/install.sh | bash
```

### Windows

If you have [Scoop](https://scoop.sh/) (recommended):
```powershell
scoop bucket add moviebox https://github.com/mesamirh/MovieBox-Tui
scoop install moviebox-tui
```

Direct install via PowerShell (no package manager needed):
```powershell
irm https://raw.githubusercontent.com/mesamirh/MovieBox-Tui/main/install.ps1 | iex
```

> **SmartScreen prompt:** If Windows displays *"Windows protected your PC"*, click **More info** → **Run anyway**.

### Android (Termux)
```bash
pkg update && pkg install -y curl tar termux-tools termux-am
curl -fsSL https://raw.githubusercontent.com/mesamirh/MovieBox-Tui/main/install.sh | bash
termux-setup-storage
```

<details>
<summary><b>Cargo & Source Build</b></summary>

```bash
cargo install moviebox-tui --locked
```

From source:
```bash
git clone https://github.com/mesamirh/MovieBox-Tui.git
cd MovieBox-Tui
cargo build --release --locked
```

</details>

<details>
<summary><b>Verify Release Integrity</b></summary>

```bash
sha256sum -c SHA256SUMS --ignore-missing
gh attestation verify <archive-file> -R mesamirh/MovieBox-Tui
```

</details>

<details>
<summary><b>Uninstall</b></summary>

Re-run install command (`curl ... | bash` or `irm ... | iex`) and select `2) Uninstall`.

Or via package manager:
```bash
brew uninstall moviebox-tui     # Homebrew
scoop uninstall moviebox-tui    # Scoop
cargo uninstall moviebox-tui    # Cargo
```

</details>

## Quick Start

```bash
moviebox-tui
```

- Type to search, press `Enter` to play.
- Press `?` for shortcuts, or type `/settings` for preferences.

## Documentation

Full documentation at [**mesamirh.github.io/MovieBox-Tui**](https://mesamirh.github.io/MovieBox-Tui/) or [`docs/`](docs/):

| Guide | Description |
| :--- | :--- |
| [Keyboard & Controls](docs/controls.md) | Keybindings, vim navigation, and shortcuts |
| [Configuration](docs/config.md) | Settings, themes, and environment variables |
| [Content Providers](docs/providers.md) | Native scrapers (MovieBox, 4KHDHub, Dramachi, BDIX) |
| [Stremio Addons](docs/addons-mode.md) | Community addon configuration and streaming |
| [Hardware Players](docs/players.md) | Player detection, launch options, and flags |
| [Live TV & IPTV](docs/tv-mode.md) | M3U playlist import and channel streaming |
| [Batch Downloads](docs/downloads.md) | HTTP range engine, pause, and resume |

## Contributing

Review [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests. Report bugs via [GitHub Issues](https://github.com/mesamirh/MovieBox-Tui/issues).

<details>
<summary><b>Support</b></summary>
<div id="optional-support" tabindex="-1"></div>

| Asset | Address |
| :--- | :--- |
| **USDT (TRC20)** | `TL4yW73qmbKZpBWwbEFgjBpwVkPDFTkJgV` |
| **Bitcoin (BTC)** | `3MEAtqtRWrQBhnaMi3Zuf5nt2efNUS2LUQ` |
| **Ethereum (EVM)** | `0x7ea20d5fa29d87f33195f5a3b211ff94038d794c` |
| **Solana (SOL)** | `6ctm5WFv73MNywoCKAz3xK72yizSspHa72rFNygooU6` |

</details>

## Privacy

Zero telemetry, analytics, or user tracking. History, favorites, and config remain local.

## License

Dual-licensed under [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE).

## Disclaimer

MovieBox-TUI does not host or store media. It plays publicly available streams. Users must comply with local laws.

---

## well-cinebox — web front-end (`web/`)

This fork adds a **Next.js webapp** (HBO Max-style dark UI) that fronts the
MovieBox provider through a TypeScript backend-for-frontend (BFF). The Rust
TUI is untouched; everything web lives under `web/`.

**What `web/` contains**

- App Router UI: home rails (`?tab=2`), search, title details with season /
  episode picker, and a player page (HTML5 video + quality picker + WebVTT
  subtitles, DASH via dash.js).
- BFF API routes implementing the provider contract (visitor-login session,
  HMAC-MD5 request signing, 7-host pool with retry rotation):
  `GET /api/home`, `/api/search`, `/api/title`, `/api/play`,
  `GET /api/stream?token=` (signed, range-aware byte proxy with server-side
  Referer/Cookie injection and DASH manifest rewriting),
  `GET /api/subtitle` (list + signed WebVTT download),
  `GET /api/debug/provider` (per-host reachability report).
- All provider fetches route through `MOVIEBOX_PROXY_URL` when set.
- Bundled offline **demo catalog** (`web/data/demo-catalog.json`, BigBuckBunny
  stand-in stream), served with an honest "Demo" badge whenever the provider
  is unreachable.

**Auto-sync with upstream**

`.github/workflows/sync-upstream.yml` runs daily (03:17 UTC) and on demand:
it merges `mesamirh/MovieBox-Tui` `main` into this fork's `main` with a plain
merge that fails loudly on conflict (never auto-resolves). Upstream never
touches `web/`, so merges are normally clean.

**Deploy to Vercel**

1. Import the repo; set **Root Directory** to `web`.
2. Add environment variables (see `web/.env.example`):

   | name | required | purpose |
   | --- | --- | --- |
   | `STREAM_SIGNING_SECRET` | yes | HMAC-SHA256 key for `/api/stream` & `/api/subtitle` tokens (`openssl rand -hex 32`) |
   | `NEXT_PUBLIC_SITE_URL` | recommended | public base URL, e.g. `https://well-cinebox.vercel.app` |
   | `MOVIEBOX_PROXY_URL` | for a live catalog | HTTP(S) egress proxy with residential/mobile exit IP |
   | `MOVIEBOX_HOME_TAB` | no (default `2`) | provider tab rendered on the home page |
   | `MOVIEBOX_TIMEOUT_MS` | no (default `12000`) | per-request provider timeout |
   | `CONTENT_CACHE_TTL_MS` | no (default `300000`) | home-rail cache TTL |
   | `STREAM_TOKEN_TTL_SEC` | no (default `21600`) | stream token lifetime (clamped to upstream cookie expiry) |
   | `DEMO_MODE` | no (default `false`) | force the offline demo catalog |

3. Deploy.

**Proxy requirement for a live catalog**

The MovieBox edge blocks datacenter IPs — Vercel egress gets HTTP 403/440 keyed
off the real TCP source IP, regardless of request signing. Without
`MOVIEBOX_PROXY_URL` (a proxy whose exit IP is residential/mobile in a served
region) the app runs on the bundled demo catalog. Verify with
`GET /api/debug/provider`, which reports every host, status, latency, and
whether the proxy is in the path — no secrets are ever exposed in its output.
