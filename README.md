# companion-module-dmxcore-100

Bitfocus Companion connection for the [DMX Core 100](https://dmxcore.com/dmx-core-100). It uses the device [Integration API](https://docs.dmxcore.com/dmx-core-100/integrations/integration-api/): catalog dropdowns, execute commands, and live WebSocket state for button feedback.

Companion help text lives in [companion/HELP.md](./companion/HELP.md).

## Develop

Requires Node.js 26.5+ and Yarn 4. Needs Companion 5.0 or later (`node26` runtime).

```bash
npm install -g corepack
corepack enable
yarn install
yarn build
yarn lint
yarn test
```

`yarn dev` rebuilds on change. For day-to-day work, install this folder as a development module in Companion (Developer → Modules, or drop it into the Companion modules directory, depending on your Companion version). That loads compiled `dist/` source, not the importable package.

## Package for Companion

Companion imports a packaged `.tgz`, not the git checkout. `yarn package` compiles TypeScript, then runs `companion-module-build` to bundle the module the same way Bitfocus does for the store.

### Manual build

```bash
npm install -g corepack
corepack enable
yarn install
yarn package
```

That writes:

| Output | Use |
| --- | --- |
| `pkg/` | Unpacked bundle. Companion loads this if you create an empty `DEBUG-PACKAGED` file in the module root. |
| `dmxcore-100-<version>.tgz` | File to import. The version comes from `package.json` (currently `0.2.4`). |

`pkg/` and `*.tgz` are gitignored.

### Import the tarball

1. Open Companion **5.0 or later** (this module uses the `node26` runtime).
2. In the admin UI go to **Modules**.
3. Choose **Import Module Package** and select `dmxcore-100-<version>.tgz`.
4. Add a connection: **DMX Core: DMX Core 100**.
5. Enable the Integration API on the device, paste an API key, and set host/port (see [companion/HELP.md](./companion/HELP.md)).

To test a local packaged build without importing, create an empty `DEBUG-PACKAGED` file next to `package.json` so Companion reads `pkg/` instead of source. Remove that file when you go back to development, or Companion will keep serving the last package.

A `--dev` package keeps line numbers readable if you need to debug the bundle:

```bash
yarn build && yarn companion-module-build --dev
```

### GitHub Actions package

The **Package module** workflow (`.github/workflows/package.yaml`) runs the same `yarn package` on every push, pull request, v-prefixed version tag (`v1.2.3` and similar), and manual **Run workflow**. Other tag names do not trigger it.

1. Open the repo on GitHub → **Actions** → **Package module**.
2. Open a successful run and download the `companion-module-dmxcore-100` artifact.
3. Unpack the artifact zip if your browser saved it that way; inside is `dmxcore-100-<version>.tgz`.
4. Import that `.tgz` in Companion as above.

## Mock Integration API

There is no DMX Core application within this repo. To exercise catalog/execute/events locally:

```bash
yarn mock
```

The mock listens on `http://127.0.0.1:8080/api/integration/v1` with API key `test-key`, and accepts WebSocket clients on `/events`.

## Module layout

| Path | Role |
| --- | --- |
| `src/main.ts` | Connection lifecycle, HTTP + WebSocket |
| `src/api.ts` | Integration API HTTP client |
| `src/events.ts` | WebSocket event stream |
| `src/entities.ts` | Entity/state parsing and dropdown helpers |
| `src/actions.ts` | Scene, switch, level, select execute |
| `src/feedbacks.ts` | Boolean button feedback |
| `src/presets.ts` | Drag-and-drop buttons |
| `src/variables.ts` | Device + catalog variables |
| `src/state.ts` | Catalog/state store |
