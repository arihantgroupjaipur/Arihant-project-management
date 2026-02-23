import api from './api';

export const getTasks = async (projectId) => {
    try {
        const response = await api.get('/tasks');
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Error fetching tasks';
    }
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
