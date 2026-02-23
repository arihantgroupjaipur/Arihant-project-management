import express from 'express';
import Task from '../models/Task.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// protect all routes
router.use(authMiddleware);

// Create a new task
router.post('/', async (req, res) => {
    try {
        const { workParticulars, contractor, plannedStartDate, plannedFinishDate, duration } = req.body;

        // Ensure user is a project manager (or admin)
        if (req.user.role !== 'project_manager' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Project Manager role required.' });
        }

        // Generate sequential Task ID: TK-000001, TK-000002, ...
        const lastTask = await Task.findOne({ taskId: { $exists: true } })
            .sort({ taskId: -1 });

        let nextNumber = 1;
        if (lastTask?.taskId) {
            const lastNumber = parseInt(lastTask.taskId.replace('TK-', ''), 10);
            if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
        }
        const taskId = `TK-${String(nextNumber).padStart(6, '0')}`;

        const newTask = new Task({
            workParticulars,
            contractor,
            plannedStartDate,
            plannedFinishDate,
            duration,
            projectManager: req.user.id,
            taskId,
        });

        const savedTask = await newTask.save();
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

        let query = {};
        if (req.user.role === 'project_manager') {
            query.projectManager = req.user.id;
        }

        const tasks = await Task.find(query)
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

        // Allow PM to update only their tasks? Or any task?
        // Requirement implies PM manages tasks.
        // For strictness: if (req.user.role === 'project_manager' && task.projectManager.toString() !== req.user.id) ... 
        // But for now, let's allow PM to update any task or stick to the list logic.

        Object.assign(task, req.body);
        const updatedTask = await task.save();

        // Populate for return
        await updatedTask.populate('contractor', 'name');
        await updatedTask.populate('projectManager', 'fullName email');

        res.status(200).json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a task (admin only)
router.delete('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only admins can delete tasks.' });
        }

        await Task.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
