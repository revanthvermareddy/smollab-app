# SmolLab App — Copilot Instructions

## Build & Run

This is an Expo SDK 54 React Native app with native modules (llama.rn). **Expo Go will not work** — a development build is required.

```bash
npm install
npx expo prebuild --clean   # Generate ios/ and android/ native projects
npx expo run:ios             # or: npx expo run:android
```

Lint: `npm run lint` (uses eslint-config-expo flat config).

No test framework is configured yet.

## Architecture

### Auth-Gated Routing

The app uses Expo Router with two route groups and an auth guard in `app/_layout.tsx`:

- **`(auth)/`** — Login screen (unauthenticated users)
- **`(app)/(tabs)/`** — Main app tabs: Chat, Models, Settings

`AuthGate` in the root layout checks `isAuthenticated` from `AuthProvider` and redirects between groups. All auth state (OAuth tokens) is persisted in `expo-secure-store`.

### Provider Hierarchy

Providers nest in this order (defined across layout files):

```
ThemeProvider → AuthProvider → AuthGate
  └─ (app) route: ModelProvider → InferenceProvider → Tab screens
```

`ModelProvider` and `InferenceProvider` are only mounted inside the authenticated `(app)` group, not at the root.

### Core Services (`lib/`)

| Module | Role |
|--------|------|
| `config.ts` | HuggingFace OAuth endpoints, scopes, redirect URI, default model repo |
| `auth.tsx` | `AuthProvider` + `useAuth()` — HF OAuth PKCE flow via `expo-auth-session` |
| `models.ts` | HF Hub API calls + local file management (download, list, delete GGUF files) |
| `model-context.tsx` | `ModelProvider` + `useModels()` — tracks downloads, progress, active model selection |
| `inference.tsx` | `InferenceProvider` + `useInference()` — llama.rn model loading, chat completion with streaming |

### HuggingFace Integration

- **OAuth**: PKCE flow (no client secret). Scopes: `openid`, `profile`, `read-repos`. Redirect: `smollabapp://oauth/callback`.
- **Model API**: `GET /api/models/{repo}` for file listing, filter for `.gguf` files. Download via `GET /{repo}/resolve/main/{filename}` with Bearer token.
- **Config**: OAuth client ID and default model repo are in `lib/config.ts`.

### On-Device Inference (llama.rn)

Models are loaded via `initLlama()` with these defaults: `n_ctx: 2048`, `n_gpu_layers: 99`, `n_batch: 512`, `use_mlock: true`. Chat completion uses the `context.completion()` API with a streaming token callback. The system prompt and stop words array are defined in `lib/inference.tsx`.

## Key Conventions

### Expo SDK 54 File System API

This project uses the **new class-based** `expo-file-system` API (SDK 54), not the legacy `FileSystem.*` functions:

```typescript
import { File, Directory, Paths } from 'expo-file-system';

const dir = new Directory(Paths.document, 'models');
dir.exists;                                    // boolean, not async
dir.create({ intermediates: true });           // sync
dir.list();                                    // returns (File | Directory)[]

const file = new File(dir, 'model.gguf');
file.write(uint8Array);                        // sync write
file.delete();                                 // sync delete
```

`File.downloadFileAsync()` in SDK 54 does not support progress callbacks, so `lib/models.ts` uses **fetch streaming** (`response.body.getReader()`) with an `AbortController` for cancellation and manual progress tracking.

### Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`). Use `@/lib/...`, `@/hooks/...`, `@/components/...` etc.

### Theming

Dual light/dark theme defined in `constants/theme.ts`. Access via `useThemeColor()` hook. The app's brand color is `#FFD21E` (yellow) on a `#1a1a2e` dark background.

### Native Plugins (app.json)

The `llama.rn` Expo config plugin is configured with `enableEntitlements`, `forceCxx20`, and `enableOpenCL`. Build properties set iOS deployment target 16.0+ and Android minSdk 26. Changes to these require `npx expo prebuild --clean`.
