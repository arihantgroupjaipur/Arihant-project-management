import api from './api';

export const getTasks = async ({ page = 1, limit = 20, search = '', status = '' } = {}) => {
    try {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', limit);
        if (search) params.set('search', search);
        if (status && status !== 'all') params.set('status', status);
        const response = await api.get(`/tasks?${params.toString()}`);
        return response.data; // { tasks, total, page, limit, hasMore }
    } catch (error) {
        throw error.response?.data?.message || 'Error fetching tasks';
    }
};

// Convenience helper — returns a plain array of all tasks (for dropdowns, selectors, etc.)
export const getTasksAll = async () => {
    const data = await getTasks({ limit: 1000 });
    return data?.tasks || [];
};


export const createTask = async (taskData) => {
    try {
        const response = await api.post('/tasks', taskData);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Error creating task';
    }
};

export const deleteTask = async (id) => {
    try {
        const response = await api.delete(`/tasks/${id}`);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Error deleting task';
    }
};

export const updateTask = async (id, taskData) => {
    try {
        const response = await api.put(`/tasks/${id}`, taskData);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Error updating task';
    }
};
