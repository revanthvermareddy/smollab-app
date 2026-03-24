# SmolLab

Run small language models directly on your mobile device, powered by HuggingFace.

## Features

- **HuggingFace OAuth** — Sign in with your HuggingFace account
- **Model Management** — Browse, download, and delete GGUF models from HuggingFace Hub
- **On-Device Inference** — Run models locally using llama.cpp (via llama.rn)
- **Chat Interface** — Interactive chat with streaming responses
- **GPU Accelerated** — Metal (iOS) and OpenCL (Android) support

## Setup

### Prerequisites

- Node.js 18+
- iOS Simulator / Android Emulator or physical device
- A [HuggingFace OAuth app](https://huggingface.co/settings/applications/new)

### HuggingFace OAuth App

1. Go to [HuggingFace Settings → Applications](https://huggingface.co/settings/applications/new)
2. Create a new OAuth app (public, no secret needed)
3. Set redirect URI to: `smollabapp://oauth/callback`
4. Copy the Client ID
5. Update `lib/config.ts` with your Client ID

### Install & Run

```bash
npm install

# Development build (required for llama.rn native module)
npx expo prebuild
npx expo run:ios    # or run:android
```

> **Note:** This app requires a development build — it uses native modules (llama.rn) that aren't available in Expo Go.

## Architecture

```
app/
  _layout.tsx          # Root layout with auth guard
  (auth)/login.tsx     # HuggingFace OAuth login screen
  (app)/(tabs)/
    index.tsx          # Chat interface
    models.tsx         # Model browser & manager
    settings.tsx       # Account & storage settings
lib/
  config.ts            # HF OAuth & API configuration
  auth.tsx             # AuthProvider (OAuth PKCE flow)
  models.ts            # Model download/delete/list service
  model-context.tsx    # React context for model state
  inference.tsx        # llama.rn inference provider
```

## Default Model

The app is pre-configured with `mrdbourke/queensland-ai-fine-tuned-gemma3-live` but you can enter any HuggingFace repo containing GGUF files in the Models tab.
