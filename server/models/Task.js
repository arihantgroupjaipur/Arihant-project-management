import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    workParticulars: {
        type: String,
        required: true,
        trim: true
    },
    contractor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contractor',
        required: false,
    },
    contractorName: {
        type: String,
        trim: true,
        default: '',
    },
    plannedStartDate: {
        type: Date,
        required: true
    },
    plannedFinishDate: {
        type: Date,
        required: true
    },
    duration: {
        type: String, // Can be "5 days", "2 weeks", etc.
        required: true
    },
    projectManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    taskId: {
        type: String,
        unique: true,
        trim: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed'],
        default: 'Pending'
    }
}, { timestamps: true });

// Indexes for fast querying at scale
taskSchema.index({ status: 1 });           // fast filter by status
taskSchema.index({ projectManager: 1 });   // fast filter by PM
taskSchema.index({ createdAt: -1 });       // default sort
taskSchema.index(                          // full-text search on key fields
    { workParticulars: 'text', contractorName: 'text', taskId: 'text' },
    { name: 'task_text_search' }
);

const Task = mongoose.model('Task', taskSchema);

export default Task;
