// HuggingFace OAuth configuration
// Register your app at https://huggingface.co/settings/applications/new
// Set redirect URI to: smollabapp://oauth/callback

export const HF_CONFIG = {
  clientId: '4202b6fe-86b9-4877-9e21-dad826df4ee5', // Replace with your HF OAuth app client ID
  scopes: ['openid', 'profile', 'read-repos'],
  authorizationEndpoint: 'https://huggingface.co/oauth/authorize',
  tokenEndpoint: 'https://huggingface.co/oauth/token',
  userinfoEndpoint: 'https://huggingface.co/oauth/userinfo',
  redirectUri: 'smollabapp://oauth/callback',
};

export const HF_API_BASE = 'https://huggingface.co';

// Default model to load on first launch
export const DEFAULT_MODEL_REPO = 'mrdbourke/queensland-ai-fine-tuned-gemma3-live';
