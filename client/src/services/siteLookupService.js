import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getToken = () => localStorage.getItem('token');
const headers = () => ({ Authorization: `Bearer ${getToken()}` });

export const getSiteLookups = async (type = null) => {
    const params = type ? `?type=${type}` : '';
    const res = await axios.get(`${API_URL}/site-lookups${params}`, { headers: headers() });
    return res.data;
};

export const createSiteLookup = async (type, value) => {
    const res = await axios.post(`${API_URL}/site-lookups`, { type, value }, { headers: headers() });
    return res.data;
};

export const updateSiteLookup = async (id, value) => {
    const res = await axios.put(`${API_URL}/site-lookups/${id}`, { value }, { headers: headers() });
    return res.data;
};

export const deleteSiteLookup = async (id) => {
    const res = await axios.delete(`${API_URL}/site-lookups/${id}`, { headers: headers() });
    return res.data;
};

export default { getSiteLookups, createSiteLookup, updateSiteLookup, deleteSiteLookup };
