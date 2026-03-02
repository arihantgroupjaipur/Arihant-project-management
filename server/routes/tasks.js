import express from 'express';
import Task from '../models/Task.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { sendTaskAssignmentEmail } from '../utils/emailService.js';

const router = express.Router();

// protect all routes
router.use(authMiddleware);

// Create a new task
router.post('/', async (req, res) => {
    try {
        const { workParticulars, contractor, contractorName, plannedStartDate, plannedFinishDate, duration } = req.body;

        if (req.user.role !== 'project_manager' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Project Manager role required.' });
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

        res.status(201).json(savedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all tasks
router.get('/', async (req, res) => {
    try {
        // Optionally filter by project manager if they only want to see their own tasks
        // For now, let's return all tasks or filter by query param if needed
        // Assuming we want to show all tasks for now or maybe just the ones created by this PM
        // Let's return all tasks for admins, and only created tasks for PMs?
        // Requirement was "Project manager ... assign the tasks. and monitor".
        // It's likely they want to see what they assigned.

        const tasks = await Task.find({})
            .populate('contractor', 'name') // Assuming Contractor model has a 'name' field
            .populate('projectManager', 'fullName email')
            .sort({ createdAt: -1 });

        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a task
router.put('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'project_manager' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const { contractor, contractorName, ...otherUpdates } = req.body;
        Object.assign(task, otherUpdates);

        // Handle contractor transition
        if (contractor) {
            task.contractor = contractor;
            task.contractorName = contractorName || '';
        } else {
            task.contractor = undefined; // unset ref
            task.contractorName = contractorName || '';
        }

        const updatedTask = await task.save();

        // Populate for return
        await updatedTask.populate('contractor', 'name');
        await updatedTask.populate('projectManager', 'fullName email');

        res.status(200).json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a task (admin or project_manager)
router.delete('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'project_manager') {
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
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
