import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const getIndents = async () => {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/indents`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
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
    createIndent,
    updateIndent,
    verifyIndent,
    deleteIndent,
};

export default indentService;
