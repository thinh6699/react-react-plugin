# Figma React Plugin

Starter plugin using **Vite + React + Tailwind CSS**. UI state uses **`useState`**; **Redux Toolkit** is installed and wired under `src/store/` for later growth.

## What is a Figma plugin?

A Figma plugin is a small program that runs **inside the Figma desktop app** and extends the editor (create layers, edit styles, read selection, open a custom UI, call APIs, etc.).

It has **two runtimes**:

| Part | Runs where | Can access |
|------|------------|------------|
| **Main thread** (`src/code/code.ts`) | Sandboxed JS in Figma | `figma` Plugin API (document / canvas) — **no DOM / fetch** |
| **UI iframe** (`src/App.tsx` …) | Browser iframe | React, DOM, Tailwind, `fetch` — **no direct `figma` API** |

They talk only via `postMessage`:

```
UI  →  parent.postMessage({ pluginMessage })  →  figma.ui.onmessage
UI  ←  figma.ui.postMessage(…)                ←  window.onmessage
```

`manifest.json` tells Figma which built files to load:

- `main` → `dist/code.js`
- `ui` → `dist/index.html` (single-file HTML from Vite)

## State management

- **Demo UI:** local `useState` in `App.tsx` (enough for this plugin).
- **Redux Toolkit:** pre-installed (`src/store/`), `Provider` already wraps the app. Add real slices / `useAppSelector` when state outgrows local hooks.
- **React Router:** not included — use view state for small modals.

## Example in this repo

1. Open the UI, pick a count + color.
2. Click **Create** → UI posts `{ type: 'create-rectangles' }`.
3. Main thread creates rectangles on the canvas and notifies the UI.
4. Selection changes are pushed from main → React state.

## Setup

```bash
# use Node 20+
nvm use 22
cd figma-react-plugin
npm install
npm run build
```

## Run in Figma

1. Open **Figma desktop app** (plugins need the desktop app for local development).
2. Create / open a Design file.
3. **Plugins → Development → Import plugin from manifest…**
4. Select this folder’s `manifest.json`.
5. Run the plugin from **Plugins → Development → Figma React Plugin**.

During development:

```bash
npm run watch   # rebuild UI + main on change; enable Hot reload in Figma
```

Or preview the UI alone in a browser:

```bash
npm run dev
```

## Project layout

```
manifest.json          # Figma entry points
src/
  code/code.ts         # Main thread (Plugin API)
  shared/messages.ts   # Typed postMessage contracts
  components/          # React UI
  hooks/               # useFigmaMessages
  store/               # Redux Toolkit (sample / ready, unused by demo UI)
scripts/build-code.mjs # esbuild for main thread
dist/
  code.js
  index.html           # inlined React UI
```

## Docs

- [Plugin API docs](https://developers.figma.com/docs/plugins/)
- [How plugins run](https://developers.figma.com/docs/plugins/how-plugins-run/)
- [Creating a UI](https://developers.figma.com/docs/plugins/creating-ui/)
