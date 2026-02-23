import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const getQAQCEntries = async () => {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/qaqc`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const createQAQCEntry = async (data) => {
    const token = localStorage.getItem("token");
    const response = await axios.post(`${API_URL}/qaqc`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

const qaqcService = {
    getQAQCEntries,
    createQAQCEntry,
};

export default qaqcService;
