import api from './api';

// Progress report — { period: 'daily'|'weekly'|'monthly', site?, from?, to? }
export const getProgressReport = async ({ period = 'daily', site, from, to } = {}) => {
    try {
        const params = new URLSearchParams({ period });
        if (site) params.set('site', site);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const response = await api.get(`/reports/progress?${params.toString()}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to load progress report');
    }
};

// Distinct site/project names, for the filter dropdown
export const getReportSites = async () => {
    try {
        const response = await api.get('/reports/sites');
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to load sites');
    }
};

// Past AI analyses, newest first — { period?, site? }
export const getAnalysisHistory = async ({ period, site } = {}) => {
    try {
        const params = new URLSearchParams();
        if (period) params.set('period', period);
        if (site) params.set('site', site);
        const response = await api.get(`/reports/analysis-history?${params.toString()}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to load analysis history');
    }
};

// One saved analysis in full, by id
export const getAnalysisById = async (id) => {
    try {
        const response = await api.get(`/reports/analysis-history/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to load analysis');
    }
};

export default { getProgressReport, getReportSites, getAnalysisHistory, getAnalysisById };
