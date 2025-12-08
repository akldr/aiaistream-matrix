/**
 * API route to log TTS inputs server-side.
 * Writes daily log files under /app/logs/tts-YYYY-MM-DD.log
 */
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text } = req.body || {};
    const trimmed = (text || '').toString().trim().slice(0, 300);
    if (!trimmed) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, `tts-${dateKey}.log`);
    const line = `[${now.toISOString()}] ${trimmed}\n`;

    await fs.mkdir(logDir, { recursive: true });
    await fs.appendFile(logFile, line, 'utf8');

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('TTS log write failed:', err);
    return res.status(500).json({ error: 'Failed to write log' });
  }
}
