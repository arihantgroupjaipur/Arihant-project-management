import { google } from 'googleapis';
import Task from '../models/Task.js';
import Setting from '../models/Setting.js';
import dotenv from 'dotenv';
dotenv.config();

const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Column headers written to row 1
const HEADERS = [
    'Task ID',
    'Work Particulars',
    'Contractor',
    'Planned Start',
    'Planned Finish',
    'Duration (Days)',
    'Status',
    'Project Manager',
    'Created At',
];

/**
 * Returns an authenticated Google Sheets client along with the dynamically fetched Sheet ID.
 * Throws clearly if credentials or the linked sheet ID are missing.
 */
async function getSheetsConfig() {
    const settingObj = await Setting.findOne({ key: 'google_sheet_id' });
    let sheetIds = [];

    if (settingObj?.value) {
        if (Array.isArray(settingObj.value)) {
            sheetIds = settingObj.value;
        } else if (typeof settingObj.value === 'string') {
            // fallback for backward compatibility if stored as comma-separated string
            sheetIds = settingObj.value.split(',').map(s => s.trim()).filter(Boolean);
        }
    }

    if (sheetIds.length === 0) {
        throw new Error('Google Sheet ID(s) not configured. Please link a spreadsheet in Admin > Settings.');
    }

    if (!CLIENT_EMAIL || !PRIVATE_KEY) {
        throw new Error(
            'Google Sheets credentials missing. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in .env'
        );
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: CLIENT_EMAIL,
            private_key: PRIVATE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return { sheets: google.sheets({ version: 'v4', auth }), sheetIds };
}

/**
 * Formats a Date value to DD/MM/YYYY or returns '—' for empty values.
 */
function formatDate(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleDateString('en-IN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    } catch {
        return String(value);
    }
}

/**
 * Fetches all tasks from MongoDB and writes them as a full snapshot to ALL
 * configured Google Sheets. Existing data (rows 2+) is cleared before writing.
 *
 * Fire & forget — never call await on this from route handlers.
 */
export async function syncAllTasksToSheet() {
    try {
        const { sheets, sheetIds } = await getSheetsConfig();

        // Fetch all tasks (no pagination limit needed — this is internal)
        const tasks = await Task.find()
            .populate('contractor', 'name')
            .populate('projectManager', 'fullName')
            .sort({ createdAt: -1 });

        // Build rows: [header, ...data]
        const rows = [
            HEADERS,
            ...tasks.map(t => [
                t.taskId || '—',
                t.workParticulars || '—',
                t.contractor?.name || t.contractorName || '—',
                formatDate(t.plannedStartDate),
                formatDate(t.plannedFinishDate),
                t.duration != null ? `${t.duration} Days` : '—',
                t.status || '—',
                t.projectManager?.fullName || '—',
                formatDate(t.createdAt),
            ]),
        ];

        const range = 'Sheet1!A1';

        // Sync to all configured sheets in parallel
        const syncPromises = sheetIds.map(async (sheetId) => {
            try {
                // 1. Clear existing data including header
                await sheets.spreadsheets.values.clear({
                    spreadsheetId: sheetId,
                    range: 'Sheet1',
                });

                // 2. Write the fresh snapshot
                await sheets.spreadsheets.values.update({
                    spreadsheetId: sheetId,
                    range,
                    valueInputOption: 'RAW',
                    requestBody: { values: rows },
                });

                console.log(`[GoogleSheets] Synced ${tasks.length} tasks to sheet: ${sheetId}`);
            } catch (err) {
                console.error(`[GoogleSheets] Failed to sync tasks to sheet: ${sheetId}`, err.message);
            }
        });

        await Promise.allSettled(syncPromises);

    } catch (err) {
        // Log but never let this crash/block the main API response
        console.error('[GoogleSheets] Sync failed:', err.message);
    }
}
