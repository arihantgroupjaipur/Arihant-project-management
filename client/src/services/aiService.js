import api from './api';

// Chat with the AI assistant — { message, history? } -> { reply }
export const chatWithAI = async (message, history = []) => {
    try {
        const response = await api.post('/ai/chat', { message, history });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'AI chat failed');
    }
};

// Summarize/extract fields from an already-uploaded document — { key, prompt? } -> { result }
export const extractDocument = async (key, prompt) => {
    try {
        const response = await api.post('/ai/extract-document', { key, prompt });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'AI document extraction failed');
    }
};

// Compare 2-3 vendor quotations and pick the cheapest — { quotation1Url?, quotation2Url?, quotation3Url? }
// -> { quotations: {...}, cheapest: 'quotation1'|'quotation2'|'quotation3'|null, reasoning: string }
export const compareQuotations = async (urls) => {
    try {
        const response = await api.post('/ai/compare-quotations', urls);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'AI quotation comparison failed');
    }
};

// Builds one combined, cost-optimal quotation by picking the cheapest rate per item across 2-8 quotations
// urls: string[] (S3 keys) -> { items: [...], optimalTotal, singleVendorTotals, estimatedSavings, reasoning }
export const optimizeQuotations = async (urls) => {
    try {
        const response = await api.post('/ai/optimize-quotations', { urls });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'AI quotation optimization failed');
    }
};

// AI analysis of a progress report — { period, site?, from?, to? }
// -> { summary, underperformers: [...], discrepancies: [...], recommendations: [...] }
export const analyzeProgressReport = async ({ period, site, from, to }) => {
    try {
        const response = await api.post('/ai/progress-analysis', { period, site, from, to });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'AI progress analysis failed');
    }
};

// Send (or schedule) the AI audio briefing email to the CEO — { period, site?, ceoEmail, scheduledFor? }
export const sendCeoReport = async ({ period, site, ceoEmail, scheduledFor }) => {
    try {
        const response = await api.post('/ai/ceo-report', { period, site, ceoEmail, scheduledFor });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to send CEO report');
    }
};

// List scheduled/sent CEO reports, newest first
export const getCeoReportSchedule = async () => {
    try {
        const response = await api.get('/ai/ceo-report/schedule');
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to load CEO report schedule');
    }
};

export default { chatWithAI, extractDocument, compareQuotations, optimizeQuotations, analyzeProgressReport, sendCeoReport, getCeoReportSchedule };
