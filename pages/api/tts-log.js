import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, engine, language, timestamp } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text field' });
    }

    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create daily log file (e.g., tts-2025-12-09.log)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const logFile = path.join(logsDir, `tts-${dateStr}.log`);

    // Format log entry
    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      engine: engine || 'unknown',
      language: language || 'unknown',
      text: text,
    };

    // Append to log file
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFile, logLine, 'utf-8');

    return res.status(200).json({ 
      success: true, 
      message: 'Log saved',
      file: `tts-${dateStr}.log`
    });
  } catch (error) {
    console.error('Error writing log:', error);
    return res.status(500).json({ error: 'Failed to save log', details: error.message });
  }
}
