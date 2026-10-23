import api from './api';

// BOQ/BOM reference rows (read-only), optionally filtered by a search term
export const getBoqRows = async (search) => {
    try {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await api.get(`/procurement/boq${params}`);
        return res.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to load BOQ/BOM sheet');
    }
};

// IMS (inventory) reference rows (read-only), optionally filtered by a search term
export const getImsRows = async (search) => {
    try {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await api.get(`/procurement/ims${params}`);
        return res.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to load IMS sheet');
    }
};

// Joined BOM + current stock for a task's work name (Task.workParticulars)
export const getBoqCheck = async (task) => {
    try {
        const res = await api.get(`/procurement/boq-check?task=${encodeURIComponent(task)}`);
        return res.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to check BOQ/stock');
    }
};

// Negotiation rounds for a Purchase Order
export const getNegotiations = async (purchaseOrderId) => {
    try {
        const res = await api.get(`/procurement/negotiations/${purchaseOrderId}`);
        return res.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to load negotiations');
    }
};

export const createNegotiation = async ({ purchaseOrderReference, vendorName, offerAmount, counterOfferAmount, notes }) => {
    try {
        const res = await api.post('/procurement/negotiations', { purchaseOrderReference, vendorName, offerAmount, counterOfferAmount, notes });
        return res.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to save negotiation round');
    }
};

export default { getBoqRows, getImsRows, getBoqCheck, getNegotiations, createNegotiation };
