/**
 * Cloudflare Worker for TTS Log Persistence
 * Handles POST requests to /api/tts-log and stores logs in KV storage
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle TTS logging endpoint
    if (url.pathname === '/api/tts-log' && request.method === 'POST') {
      return handleTTSLog(request, env);
    }

    // Pass through to Pages
    return env.ASSETS.fetch(request);
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
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare log entry
    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      engine: engine || 'unknown',
      language: language || 'unknown',
      text: text.substring(0, 300), // Limit to 300 chars
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
      // New log file
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
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error handling TTS log:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process log', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
