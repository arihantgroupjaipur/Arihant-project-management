import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const getIndents = async ({ page = 1, limit = 200, search = '', priority = '', status = '' } = {}) => {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    params.set('page', page); params.set('limit', limit);
    if (search) params.set('search', search);
    if (priority && priority !== 'all') params.set('priority', priority);
    if (status && status !== 'all') params.set('status', status);
    const response = await axios.get(`${API_URL}/indents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; // { indents, total, hasMore }
};

// Convenience helper — returns a plain array of all indents (for dropdowns, selectors, etc.)
export const getIndentsAll = async () => {
    const data = await getIndents({ limit: 500 });
    return data?.indents || [];
};


export const createIndent = async (data) => {
    const token = localStorage.getItem("token");
    const response = await axios.post(`${API_URL}/indents`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const updateIndent = async (id, data) => {
    const token = localStorage.getItem("token");
    const response = await axios.put(`${API_URL}/indents/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const verifyIndent = async (id, formData) => {
    const token = localStorage.getItem("token");
    const response = await axios.put(`${API_URL}/indents/${id}/verify`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        },
    });
    return response.data;
};

export const deleteIndent = async (id) => {
    const token = localStorage.getItem("token");
    const response = await axios.delete(`${API_URL}/indents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

const indentService = {
    getIndents,
    getIndentsAll,
    createIndent,
    updateIndent,
    verifyIndent,
    deleteIndent,
};

export default indentService;
