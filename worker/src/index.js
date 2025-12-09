/**
 * Standalone Cloudflare Worker for TTS Log Persistence
 * Handles POST requests to /api/tts-log and stores logs in KV storage
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);

    // Handle TTS logging endpoint
    if (url.pathname === '/api/tts-log' && request.method === 'POST') {
      return handleTTSLog(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Handle TTS log persistence to KV storage
 */
async function handleTTSLog(request, env) {
  try {
    const data = await request.json();
    const { text, engine, language, timestamp } = data;

    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing text field' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Check if KV is available
    if (!env.TTS_LOGS) {
      console.log('TTS Log (KV not configured):', {
        timestamp: timestamp || new Date().toISOString(),
        engine: engine || 'unknown',
        language: language || 'unknown',
        text: text.substring(0, 100) + '...'
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Log received (KV storage not configured)',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Prepare log entry
    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      engine: engine || 'unknown',
      language: language || 'unknown',
      text: text.substring(0, 300),
    };

    // Get today's date for KV key
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const kvKey = `tts-log:${dateStr}`;

    // Get existing log or create new
    let logs = [];
    try {
      const existing = await env.TTS_LOGS.get(kvKey);
      if (existing) {
        logs = JSON.parse(existing);
      }
    } catch (e) {
      logs = [];
    }

    // Append new entry
    logs.push(logEntry);

    // Store back to KV (keep max 1000 entries per day)
    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }

    await env.TTS_LOGS.put(kvKey, JSON.stringify(logs), {
      expirationTtl: 7776000, // 90 days
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Log saved to KV storage',
        key: kvKey,
        totalEntries: logs.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error handling TTS log:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process log', details: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
