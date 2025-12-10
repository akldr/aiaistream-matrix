#!/bin/bash

# Security Setup Script for aiaistream-matrix
# This script helps configure secure tokens for production deployment

set -e

echo "🔐 Security Setup for aiaistream-matrix"
echo "========================================"
echo ""

# Generate secure token
echo "📝 Generating secure access token..."
TOKEN=$(openssl rand -base64 32)
echo "Generated token: $TOKEN"
echo ""

# Save to Worker
echo "🚀 Setting Worker secret..."
echo "You'll need to run this command manually:"
echo ""
echo "  cd worker"
echo "  npx wrangler secret put LOG_ACCESS_TOKEN --env production"
echo "  # Enter this token when prompted: $TOKEN"
echo ""

# Instructions for Pages
echo "📄 Pages Environment Variable:"
echo "Set this in Cloudflare Dashboard (Workers & Pages > aiaistream-matrix > Settings):"
echo ""
echo "  NEXT_PUBLIC_TTS_API_ENDPOINT=https://aiaistream-tts-logger-production.hello-d8c.workers.dev/api/tts-log"
echo ""

# Save token for reference
echo "💾 Saving token to .env.local (for your reference only)..."
cat > .env.local << EOF
# Generated on $(date)
# DO NOT COMMIT THIS FILE TO GIT

# TTS API Endpoint
NEXT_PUBLIC_TTS_API_ENDPOINT=https://aiaistream-tts-logger-production.hello-d8c.workers.dev/api/tts-log

# Log Access Token (use this to access logs)
LOG_ACCESS_TOKEN=$TOKEN

# To view logs:
# https://aiaistream-tts-logger-production.hello-d8c.workers.dev/api/tts-log/YYYY-MM-DD?token=$TOKEN
EOF

echo "✅ .env.local created with your token"
echo ""
echo "⚠️  IMPORTANT:"
echo "  - Keep your token secret"
echo "  - Never commit .env.local to git (it's already in .gitignore)"
echo "  - Set LOG_ACCESS_TOKEN in Worker using wrangler secret"
echo ""
echo "📚 See SECURITY.md for detailed instructions"
