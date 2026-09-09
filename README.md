<p align="center">
  <img src="assets/dmxcore-logo.png" alt="DMX Core" width="420" />
</p>

# DMX Core 100 for Bitfocus Companion

Control a [DMX Core 100](https://dmxcore.com/dmx-core-100) from [Bitfocus Companion](https://bitfocus.io/companion) — play cues, toggle looks, adjust levels, and show live status on Stream Deck buttons.

This connection uses the device [Integration API](https://docs.dmxcore.com/dmx-core-100/integrations/integration-api/) (HTTP + WebSocket). No OSC client registration is required on the device.

Requires **Companion 5.0 or later**.

---

## Install (import the module)

Companion loads this module from a packaged `.tgz` file (for example `dmxcore-100-0.2.7.tgz`).

1. Open Companion and go to **Modules**.
2. Choose **Import Module Package**.
3. Select the `dmxcore-100-*.tgz` file.
4. Confirm the import. The connection **DMX Core: DMX Core 100** should appear in the module list.

### Where to get the package

- A release or Actions artifact from this repository (download `dmxcore-100-<version>.tgz`)
- Or a `.tgz` someone on your team built with `yarn package`

---

## Connect to your DMX Core

1. On the DMX Core Web UI go to **Device → System**.
2. Turn on **Enable Integration API**.
3. Click **Issue Integration API Key** (or create one under **User Management → API Keys**). Copy the key when it is shown — it is only displayed once.
4. In Companion, add a connection and choose **DMX Core: DMX Core 100**.
5. Enter:
   - **DMX Core IP / hostname**
   - **HTTP(S) port** — hardware is often **80** / **443**; desktop software is often **8000** / **8001** (same as the Web UI)
   - The **API key**
6. Enable **Use HTTPS** only if you reach the device over TLS. Tick **Allow insecure TLS** for self-signed certificates.
7. Save. When the connection is online, Companion loads the live catalog and status from the device.

Treat API keys like passwords and keep the device on a trusted network.

Full setup notes (including macOS Local Network permissions) are in [companion/HELP.md](./companion/HELP.md).

---

## What you can do

After the connection is online, open the **Presets** tab and drag buttons onto your Stream Deck layout. Presets are built from the **live catalog** on your device:

| Section | Useful for |
| --- | --- |
| **Playback** | One button per cue / timeline / sound |
| **Looks & buttons → Control** | Switch toggles and **Stop Playback** |
| **Levels → Rotary** | **Master Dimmer** and **Audio Volume** encoders |
| **Device → Status** | Now Playing and refresh |

You can also build custom buttons with actions such as Activate scene, System actions, Switch entity, Set / bump level, and Set choice.

Live variables include now playing, master level, show name, device nickname, temperatures, and more — for example `$(dmxcore:now_playing)`.

---

## Support

- Device docs: [Integration API](https://docs.dmxcore.com/dmx-core-100/integrations/integration-api/)
- In-Companion help: [companion/HELP.md](./companion/HELP.md)
- Product page: [dmxcore.com/dmx-core-100](https://dmxcore.com/dmx-core-100)

---

## For developers

Source lives in `src/`. Day-to-day: Node.js 26.5+, Yarn 4, then `yarn install`, `yarn build`, and load the folder as a development module in Companion. To produce an importable package: `yarn package` → `dmxcore-100-<version>.tgz`. Local mock API: `yarn mock` (key `test-key`, port `8080`).
