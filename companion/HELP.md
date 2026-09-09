## DMX Core 100

Control a [DMX Core 100](https://dmxcore.com/dmx-core-100) from Bitfocus Companion using the **Integration API**. Populate button dropdowns from the device catalog, execute cues/presets/levels, and show live state on Stream Deck buttons over a WebSocket — without registering an OSC Client on the device.

API reference: [Integration API](https://docs.dmxcore.com/dmx-core-100/integrations/integration-api/).

## Setup

1. On the DMX Core Web UI go to **Device → System** and turn on **Enable Integration API**.
2. Click **Issue Integration API Key** (or **User Management → API Keys**). Copy the key when it is shown — it is only displayed once.
3. In Companion, add a connection and choose **DMX Core: DMX Core 100**.
4. Set **DMX Core IP / hostname** and the **HTTP(S) port** (hardware often **80** / **443**; desktop software **8000** / **8001** — same as the Web UI).
5. Paste the Integration API key.
6. Enable **Use HTTPS** only if you reach the device over TLS; tick **Allow insecure TLS** for self-signed certificates.
7. Save. Companion calls Integration `/info`, loads `/catalog` and `/state`, opens `/events` for live updates, and also reads device `/api/status` for show name, nickname, temps, and health.

Keep the device on a trusted network and treat API keys like passwords. When the Integration API is disabled, paths under `/api/integration` return **404**.

### macOS “EHOSTUNREACH” / no route to host

If Companion logs `connect EHOSTUNREACH` to a LAN IP but a browser or `curl` from the same Mac works, macOS is blocking Companion’s **Local Network** access (common on Sequoia / Tahoe).

1. Open **System Settings → Privacy & Security → Local Network**.
2. Ensure **Companion** is enabled.
3. If it already looks enabled, toggle it **off**, quit Companion, toggle **on**, then reopen Companion.
4. Retry the connection.

This is an OS permission issue, not a wrong API key or port.

## Presets

After the connection is online, open the Presets tab. Buttons are built from the **live catalog**:

- **Playback** — one button per scene (cues / timelines / sounds)
- **Looks & buttons** — toggles for each switch, plus other system buttons (blackout, clear ambient, …)
- **Levels** — master 0 / 50 / 100% + encoder, and 100% shortcuts for other level entities
- **Device → Status** — Now Playing, Stop, Refresh catalog

Scene presets send **loop forever** (`loop: 0`) by default. Re-drag presets after the catalog changes if you add cues on the device.

The Now Playing preset shows the live cue text (green while playing) or **Stopped** when idle. Variable text on buttons uses your connection label, e.g. `$(dmxcore:now_playing)`.

## Actions

| Action | Integration API |
| --- | --- |
| Activate scene | `execute` → `activate` on a `scene` entity, optional `loop` (0 = forever) |
| System actions | `execute` → `activate` on a system button (Stop, Blackout, Clear Ambient, …) |
| Switch entity | `turnOn` / `turnOff` / `toggle` on a `switch` entity |
| Set level | `setLevel` with `level` 0–1 (Companion UI is 0–100%) |
| Bump level | Reads current state, then `setLevel` (prefer WebSocket for encoders) |
| Set choice | `setChoice` on a `select` entity |
| Refresh catalog | HTTP `GET /catalog` + `GET /state` |

**Loop:** Enable **Override loop count** on Activate scene to send `loop` with the command (same meaning as OSC / scripting: `0` = forever, `1` = once, `N` = N times). If override is off, the device uses the cue/sound’s saved Loop setting from the Web UI. The public Integration API docs only list `level` / `choice` today; `loop` matches the scripting `playCue` options and is accepted by current firmware.

Levels in Companion are **0–100%** and are sent to the device as **0.0–1.0**.

## Variables

Always available: `product`, `device_name`, `serial`, `software_version`, `protocol_version`, `connected`, `now_playing` (shows `Stopped` when idle), `master_percent`, `master_level`, `entity_count`.

From device `/api/status` (polled every 30s and on Refresh catalog): `show_name`, `hostname`, `app_version`, `cpu_temp_c`, `board_temp_c`, `sys_cpu_percent`, `app_cpu_percent`, memory/storage fields, `network_speed_mbit`, `audio_available`, `app_uptime_h`, `sys_uptime_h`, `recorder`, `player_name`, `player_code`.

`device_name` prefers the status nickname when present. On buttons use `$(connection-label:now_playing)` (for example `$(dmxcore:now_playing)` or `$(dmxcore:show_name)`).

Catalog entities also create variables such as `level_system_masterdimmer`, `switch_system_mute`, and `sensor_system_nowplaying`.

## Feedbacks

Use these to light buttons when the connection is up, something is playing, a switch is on/off, a level crosses a threshold, a select matches a choice, or a sensor text contains a string (handy for “this cue is now playing”).
