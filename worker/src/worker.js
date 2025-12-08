/**
 * Cloudflare Worker - TTS Logger
 * Stores TTS input logs in Cloudflare KV storage
 */

export default {
  async fetch(request, env, ctx) {
    const { pathname, searchParams } = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // POST /api/tts-log - Log TTS input
    if (pathname === '/api/tts-log' && request.method === 'POST') {
      try {
        const { text } = await request.json();
        const trimmed = (text || '').toString().trim().slice(0, 300);

        if (!trimmed) {
          return new Response(
            JSON.stringify({ error: 'Text is required' }),
            { status: 400, headers: corsHeaders, contentType: 'application/json' }
          );
        }

        const now = new Date();
        const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const key = `tts-logs:${dateKey}`;
        const timestamp = now.toISOString();
        const logEntry = `[${timestamp}] ${trimmed}\n`;

        // Append to KV storage (get existing, append, set back)
        let existing = '';
        try {
          existing = await env.TTS_LOGS.get(key) || '';
        } catch (e) {
          // Key doesn't exist yet, that's fine
        }

        await env.TTS_LOGS.put(key, existing + logEntry, { expirationTtl: 86400 * 30 }); // 30 days

        return new Response(
          JSON.stringify({ ok: true }),
          { status: 200, headers: corsHeaders, contentType: 'application/json' }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Failed to log', details: err.message }),
          { status: 500, headers: corsHeaders, contentType: 'application/json' }
        );
      }
    }

    // GET /api/tts-log/:date - Retrieve logs for specific date
    if (pathname.startsWith('/api/tts-log/') && request.method === 'GET') {
      try {
        const date = pathname.split('/').pop();
        const key = `tts-logs:${date}`;
        const logs = await env.TTS_LOGS.get(key) || '';

        return new Response(logs, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve logs' }),
          { status: 500, headers: corsHeaders, contentType: 'application/json' }
        );
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
