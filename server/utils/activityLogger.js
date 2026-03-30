import ActivityLog from '../models/ActivityLog.js';

/**
 * Fire-and-forget activity logger.
 * @param {'CREATE'|'UPDATE'|'DELETE'|'VERIFY'|'LOGIN'|'OTHER'} action
 * @param {string} module   e.g. 'Task', 'Indent', 'Purchase Order'
 * @param {string} description  Human-readable summary
 * @param {string} [performedBy]  Username / email
 * @param {string} [ref]          Reference ID / number shown in the log
 */
export function logActivity(action, module, description, performedBy = 'System', ref = '') {
    ActivityLog.create({ action, module, description, performedBy, ref }).catch(err =>
        console.error('[ActivityLog] Failed to save log:', err.message)
    );
}
