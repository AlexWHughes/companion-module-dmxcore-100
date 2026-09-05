## DMX Core 100

Control a [DMX Core 100](https://dmxcore.com/dmx-core-100) from Bitfocus Companion over OSC. Play cues, apply presets, start effects, ride the master dimmer, and show live playback status on Stream Deck buttons.

Built-in OSC addresses are documented at [OSC – Open Sound Control](https://docs.dmxcore.com/dmx-core-100/integrations/osc-open-sound-control/).

## Setup

1. In Companion, add a connection and choose **DMX Core: DMX Core 100**.
2. Set **DMX Core IP / hostname** to the device (the OSC server listens on UDP **8000** by default).
3. Leave **Listen for OSC feedback** enabled and **Feedback listen port** at **9000** unless you changed it.
4. On the DMX Core Web UI go to **Control & Integrations → OSC Clients**.
   - Add this Companion machine by IP.
   - Set the feedback port to the same value as the module (default 9000).
   - Do **not** bind that OSC client to an OSC control surface. A surface bound to a specific source IP swallows every message from Companion, so the built-in `/dmxcore/...` addresses never run.
5. Save. The module sends `/ping` and `/dmxcore/status` so the device starts returning live feedback.

Cue, preset, effect, zone, fixture, and Control Value **codes are case-sensitive** and must match the Code / Short Name in the Web UI exactly.

## Presets

Open the Presets tab and drag buttons onto the grid. Included groups:

- **Playback** — Play Cue (`ACT1` as an example), Stop, and a status button that shows `$(status_text)` / `$(playing_cue)`
- **Looks** — Apply Preset, Start Effect, Clear Effect
- **Master Dimmer** — 0 / 25 / 50 / 75 / 100%, fade in/out, and a rotary encoder that bumps ±5%
- **Global Color** — red / green / blue at 100%
- **Device** — Identify, refresh status, ping, and a custom OSC trigger

After dragging **Play Cue** or **Apply Preset**, edit the action and put in your real codes.

## Actions

| Action                    | OSC                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Play Cue                  | `/dmxcore/cue/<code>` optional loop count                                                                      |
| Stop Playback             | `/dmxcore/cuecontrol/stop`                                                                                     |
| Apply Preset              | `/dmxcore/preset/<code>` optional fade ms                                                                      |
| Start / Clear Effect      | `/dmxcore/effect/<code>` and `/dmxcore/effect/none`                                                            |
| Set / Fade / Bump Master  | `/dmxcore/dimmer/master` and `/dmxcore/dimmer/master/fadeto`                                                   |
| Set Zone Intensity        | `/dmxcore/dimmer/zone/<code>`                                                                                  |
| Set Control Value         | `/dmxcore/control/<code>`                                                                                      |
| Set Global Fixture Color  | `/dmxcore/fixture/red` (green, blue)                                                                           |
| Set Fixture Channel       | `/dmxcore/fixture/<code>/<dimmer\|red\|green\|blue\|white>`                                                    |
| Set Default Fade Duration | `/dmxcore/config/fadeduration`                                                                                 |
| Request Status            | `/dmxcore/status`                                                                                              |
| Identify Blink            | `/dmxcore/blink` 1 or 0                                                                                        |
| Send /ping                | `/ping`                                                                                                        |
| Send Custom OSC           | any address, for [input triggers](https://docs.dmxcore.com/dmx-core-100/scheduling-automation/input-triggers/) |

Levels in Companion are **0–100%** and are sent to the device as **0.0–1.0**.

## Variables

`status_text`, `playing_cue`, `playback_state`, `master_level`, `master_percent`, `fixture_red`, `fixture_green`, `fixture_blue`, `identify`, `last_feedback_address`, `last_feedback_value`.

Optional comma-separated **Control Value codes** in the connection config create variables such as `control_dsp1`.

## Feedbacks

Use these to light buttons when a cue is playing, playback is stopped, identify is on, or master / Control Value levels cross a threshold.

If buttons never update, confirm the OSC Client on the device uses Companion's IP and the same feedback port, and that the client is not owned by an OSC control surface.
