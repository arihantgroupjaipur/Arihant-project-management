import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

// Synthesizes text to a WAV audio buffer using espeak-ng — a free, open-source, fully offline
// TTS engine (installed via `brew install espeak-ng` / `apt install espeak-ng`). No cloud account,
// no API key, no per-request cost.
// Tuned for clarity: slower pace + a gap between words + slightly amplified volume — espeak-ng's
// biggest intelligibility win is slowing it down, since its default 175 wpm reads as a rushed mumble.
export async function synthesizeSpeech(text, { voice = 'en-us+f3', speed = 140, gap = 8, pitch = 45, amplitude = 120 } = {}) {
    const outputPath = path.join(os.tmpdir(), `tts-${crypto.randomUUID()}.wav`);
    try {
        await execFileAsync('espeak-ng', [
            '-v', voice,
            '-s', String(speed),
            '-g', String(gap),
            '-p', String(pitch),
            '-a', String(amplitude),
            '-w', outputPath,
            text,
        ]);
        return await fs.readFile(outputPath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error('espeak-ng is not installed on this server. Install it with `brew install espeak-ng` (macOS) or `apt-get install espeak-ng` (Linux).');
        }
        throw error;
    } finally {
        fs.unlink(outputPath).catch(() => { });
    }
}
