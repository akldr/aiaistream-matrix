# Security Configuration

## Environment Variables

### Required for Production

Set these in **Cloudflare Dashboard** (do NOT commit to git):

#### 1. Worker Secrets (Hidden)
Set via command line (preferred) or Cloudflare Dashboard:

```bash
# Generate a secure random token first
TOKEN=$(openssl rand -base64 32)
echo "Your token: $TOKEN"

# Set the secret in Cloudflare Worker
cd worker
wrangler secret put LOG_ACCESS_TOKEN --env production
# Paste the token when prompted

# Or set on Dashboard:
# Workers & Pages > aiaistream-tts-logger-production > Settings > Secrets
```

**Why secrets, not vars?**
- Secrets are encrypted and hidden in logs
- Variables are visible to anyone with access
- Tokens must always be secrets

#### 2. Pages Environment Variables
Navigate to: Workers & Pages > aiaistream-matrix > Settings > Environment Variables

```bash
# TTS API endpoint (points to Worker)
NEXT_PUBLIC_TTS_API_ENDPOINT=https://aiaistream-tts-logger-production.hello-d8c.workers.dev/api/tts-log
```

## Accessing Logs

### With Token Authentication

Logs now require authentication. Access with:

**URL Parameter:**
```
https://aiaistream-tts-logger-production.hello-d8c.workers.dev/api/tts-log/2025-12-10?token=YOUR_TOKEN
```

**Authorization Header:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://aiaistream-tts-logger-production.hello-d8c.workers.dev/api/tts-log/2025-12-10
```

## Deployment Steps

### 1. Set Worker Secret
```bash
cd worker
npx wrangler secret put LOG_ACCESS_TOKEN --env production
# Enter your secure token when prompted
```

### 2. Deploy Worker
```bash
npx wrangler deploy --env production
```

### 3. Set Pages Environment Variable
- Go to Cloudflare Dashboard
- Navigate to Pages project settings
- Add `NEXT_PUBLIC_TTS_API_ENDPOINT` environment variable

### 4. Deploy Pages
```bash
cd ..
npm run build
# Pages will auto-deploy on git push
```

## Security Notes

- **Never commit** tokens or secrets to git
- Use strong random tokens (32+ bytes)
- Rotate tokens periodically
- POST endpoint (writing logs) remains public but rate-limited to 1000/day
- GET endpoint (reading logs) requires authentication

## IP Address Logging

Client IP addresses are automatically captured from Cloudflare request headers:

1. **CF-Connecting-IP** (Primary) - Cloudflare's real client IP
2. **X-Forwarded-For** (Fallback) - Standard proxy header
3. **CF-Client-IP** (Fallback) - Alternative Cloudflare header
4. **X-Real-IP** (Fallback) - Nginx-style header
5. **unknown** - If no header present

**Important:** IP logging only works when:
- Requests go through Cloudflare Workers (direct Worker URL)
- Set `NEXT_PUBLIC_TTS_API_ENDPOINT` environment variable in Cloudflare Pages Dashboard
- **Do NOT hardcode Worker URLs in code** - Always use environment variables for security

## KV Namespace

The KV namespace ID in `wrangler.toml` is low-risk but included for completeness. 
It cannot be used without proper Worker/Pages authentication.

## Sensitive Files (Already Protected)

These are in `.gitignore` and should NEVER be committed:
- `.env`
- `.env.local`
- `.env.*.local`
- `*.pem`
- Any files containing actual tokens/secrets
