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
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const url = new URL(request.url);

    // Handle TTS log reading (GET /api/tts-log/{date})
    const logPathMatch = url.pathname.match(/^\/api\/tts-log\/(\d{4}-\d{2}-\d{2})$/);
    if (logPathMatch && request.method === 'GET') {
      // Verify access token for GET requests
      const token = url.searchParams.get('token') || request.headers.get('Authorization')?.replace('Bearer ', '');
      const validToken = env.LOG_ACCESS_TOKEN || 'default-insecure-token';
      
      if (token !== validToken) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid or missing access token' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
      
      // Check if browser request (Accept header contains text/html)
      const acceptHeader = request.headers.get('Accept') || '';
      const preferHtml = acceptHeader.includes('text/html');
      return handleGetLog(request, env, logPathMatch[1], preferHtml);
    }

    // Handle TTS logging endpoint (POST /api/tts-log)
    if (url.pathname === '/api/tts-log' && request.method === 'POST') {
      return handleTTSLog(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Handle reading TTS logs for a specific date
 */
async function handleGetLog(request, env, dateStr, preferHtml = false) {
  try {
    // Check if KV is available
    if (!env.TTS_LOGS) {
      const errorData = {
        error: 'KV storage not configured',
      };
      
      if (preferHtml) {
        return new Response(
          generateHtmlView(dateStr, [], 'KV storage not configured'),
          {
            status: 503,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
      
      return new Response(
        JSON.stringify(errorData),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const kvKey = `tts-log:${dateStr}`;
    const existing = await env.TTS_LOGS.get(kvKey);

    if (!existing) {
      if (preferHtml) {
        return new Response(
          generateHtmlView(dateStr, [], 'No logs found for this date'),
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          date: dateStr,
          logs: [],
          message: 'No logs found for this date',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const logs = JSON.parse(existing);
    
    if (preferHtml) {
      return new Response(
        generateHtmlView(dateStr, logs),
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        date: dateStr,
        totalEntries: logs.length,
        logs: logs,
      }, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error reading TTS log:', error);
    
    if (preferHtml) {
      return new Response(
        generateHtmlView(dateStr, [], `Error: ${error.message}`),
        {
          status: 500,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to read log', details: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

/**
 * Handle TTS log persistence to KV storage
 */
async function handleTTSLog(request, env) {
  try {
    const data = await request.json();
    const { text, engine, language, timestamp, socialMediaClick } = data;

    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing text field' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
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
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get client IP address
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-Forwarded-For')?.split(',')[0] || 
                     'unknown';

    // Prepare log entry
    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      engine: engine || 'unknown',
      language: language || 'unknown',
      text: text.substring(0, 300),
      ip: clientIP,
      socialMediaClick: socialMediaClick || null,
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
          'Content-Type': 'application/json; charset=utf-8',
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
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

/**
 * Generate HTML view for logs with proper UTF-8 encoding
 */
function generateHtmlView(dateStr, logs, errorMessage = null) {
  const logsHtml = logs.map((log, index) => `
    <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid #3b82f6;">
      <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">
        <span class="timestamp" data-utc="${log.timestamp}"></span> | ${log.engine} | ${log.language}
        ${log.ip ? ` | IP: ${log.ip}` : ''}
        ${log.socialMediaClick ? ` | 🔗 ${escapeHtml(log.socialMediaClick)}` : ''}
      </div>
      <div style="font-size: 14px; color: #e5e7eb; line-height: 1.5;">
        ${escapeHtml(log.text)}
      </div>
    </div>
  `).join('');
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TTS Logs - ${dateStr}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #0c0c10;
      color: #e5e7eb;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
      color: #f3f4f6;
    }
    .subtitle {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 24px;
    }
    .error {
      padding: 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #ef4444;
      border-radius: 8px;
      color: #fca5a5;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>TTS Logs - ${dateStr}</h1>
    <div class="subtitle">Total entries: ${logs.length}</div>
    ${errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : logsHtml}
  </div>
  <script>
    // Convert UTC timestamps to local time
    document.querySelectorAll('.timestamp').forEach(el => {
      const utcTime = el.getAttribute('data-utc');
      const date = new Date(utcTime);
      el.textContent = date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
