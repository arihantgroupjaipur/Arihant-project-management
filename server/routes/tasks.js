import express from 'express';
import Task from '../models/Task.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { sendTaskAssignmentEmail } from '../utils/emailService.js';
import { syncAllTasksToSheet } from '../utils/googleSheetsService.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

// protect all routes
router.use(authMiddleware);

// Create a new task
router.post('/', async (req, res) => {
    try {
        const { workParticulars, contractor, contractorName, plannedStartDate, plannedFinishDate, duration } = req.body;

        if (req.user.role !== 'project_manager' && req.user.role !== 'admin' && req.user.role !== 'super-admin' && req.user.role !== 'purchase_manager') {
            return res.status(403).json({ message: 'Access denied. Project Manager or Purchase Manager role required.' });
        }

        if (!workParticulars || (!contractor && !contractorName)) {
            return res.status(400).json({ message: 'Work particulars and contractor are required.' });
        }

        const lastTask = await Task.findOne({ taskId: { $exists: true } }).sort({ taskId: -1 });
        let nextNumber = 1;
        if (lastTask?.taskId) {
            const lastNumber = parseInt(lastTask.taskId.replace('TK-', ''), 10);
            if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
        }
        const taskId = `TK-${String(nextNumber).padStart(6, '0')}`;

        const newTask = new Task({
            workParticulars,
            ...(contractor ? { contractor } : {}),
            contractorName: contractorName || '',
            plannedStartDate,
            plannedFinishDate,
            duration,
            projectManager: req.user.id,
            taskId,
        });

        const savedTask = await newTask.save();

        // --- SEND ASSIGNMENT EMAILS ---
        try {
            // Get active engineers and purchase managers
            const usersToNotify = await User.find({
                role: { $in: ['engineer', 'purchase_manager'] },
                status: 'active'
            }).select('email');

            let emails = usersToNotify.map(u => u.email);
            const pmEmail = req.user.email;
            if (pmEmail && !emails.includes(pmEmail)) {
                emails.push(pmEmail);
            }

            if (emails.length > 0) {
                const pmName = req.user.fullName || pmEmail || 'System';

                // Fire and forget email dispatch
                sendTaskAssignmentEmail(emails, {
                    ...savedTask._doc,
                    projectManagerName: pmName,
                    contractorName: contractorName || 'Assignee TBA'
                }).catch(err => console.error('Failed to send task email:', err));
            }
        } catch (emailErr) {
            console.error('Error querying users for task assignment email:', emailErr);
        }

        // --- GOOGLE SHEETS SYNC (Fire & Forget) ---
        syncAllTasksToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('CREATE', 'Task', `Task created: ${savedTask.taskId || savedTask._id}`, req.user?.email, savedTask.taskId);

        res.status(201).json(savedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all tasks (with pagination, search, and status filter)
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim() || '';
        const status = req.query.status?.trim() || '';

        // Build query
        const query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            // Try to match taskId prefix first (very fast with index),
            // then fall back to regex on workParticulars
            query.$or = [
                { taskId: { $regex: search, $options: 'i' } },
                { workParticulars: { $regex: search, $options: 'i' } },
                { contractorName: { $regex: search, $options: 'i' } },
            ];
        }

        const [tasks, total] = await Promise.all([
            Task.find(query)
                .populate('contractor', 'name')
                .populate('projectManager', 'fullName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Task.countDocuments(query),
        ]);

        res.status(200).json({
            tasks,
            total,
            page,
            limit,
            hasMore: skip + tasks.length < total,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a task
router.put('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'project_manager' && req.user.role !== 'admin' && req.user.role !== 'super-admin' && req.user.role !== 'purchase_manager') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const { contractor, contractorName, ...otherUpdates } = req.body;
        Object.assign(task, otherUpdates);

        // Only update contractor fields if they were explicitly sent in the request
        if ('contractor' in req.body || 'contractorName' in req.body) {
            if (contractor) {
                task.contractor = contractor;
                task.contractorName = contractorName || '';
            } else {
                task.contractor = undefined; // unset ref
                task.contractorName = contractorName || '';
            }
        }

        const updatedTask = await task.save();

        // Populate for return
        await updatedTask.populate('contractor', 'name');
        await updatedTask.populate('projectManager', 'fullName email');

        // --- GOOGLE SHEETS SYNC (Fire & Forget) ---
        syncAllTasksToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('UPDATE', 'Task', `Task updated: ${updatedTask.taskId || updatedTask._id}`, req.user?.email, updatedTask.taskId);

        res.status(200).json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a task (admin or project_manager)
router.delete('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super-admin' && req.user.role !== 'project_manager' && req.user.role !== 'purchase_manager') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Project managers can only delete their own tasks
        if (req.user.role === 'project_manager' && task.projectManager.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only delete your own tasks.' });
        }

        await task.deleteOne();

        // --- GOOGLE SHEETS SYNC (Fire & Forget) ---
        syncAllTasksToSheet().catch(err => console.error('Sheet Sync Error:', err));
        logActivity('DELETE', 'Task', `Task deleted: ${task.taskId || task._id}`, req.user?.email, task.taskId);

        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
