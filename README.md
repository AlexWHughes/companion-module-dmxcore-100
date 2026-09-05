# companion-module-dmxcore-100

Bitfocus Companion connection for the [DMX Core 100](https://dmxcore.com/dmx-core-100). It talks the device's built-in OSC addresses: play cues, apply presets, start effects, set levels, and subscribe to status feedback.

Companion help text lives in [companion/HELP.md](./companion/HELP.md). OSC reference: [DMX Core OSC docs](https://docs.dmxcore.com/dmx-core-100/integrations/osc-open-sound-control/).

## Develop

Requires Node.js 26.5+ and Yarn 4. Needs Companion 5.0 or later (`node26` runtime).

```bash
corepack enable
yarn install
yarn build
yarn lint
yarn test
```

`yarn dev` rebuilds on change. Install the folder as a development module in Companion (Developer → Modules, or drop it into the Companion modules directory, depending on your Companion version).

Package a release tarball with `yarn package`.

### Mock OSC device

There is no DMX Core in this repo. To exercise encode/send/feedback locally:

```bash
node scripts/mock-dmxcore.mjs
```

The mock listens on UDP 8000, understands the built-in `/dmxcore/...` addresses, and sends status back to 127.0.0.1:9000.

## Module layout

| Path               | Role                                  |
| ------------------ | ------------------------------------- |
| `src/main.ts`      | Connection lifecycle, OSC send/listen |
| `src/actions.ts`   | Playback, levels, device, custom OSC  |
| `src/feedbacks.ts` | Boolean button feedback               |
| `src/presets.ts`   | Drag-and-drop buttons                 |
| `src/variables.ts` | Live status variables                 |
| `src/osc.ts`       | OSC packet codec and address helpers  |
