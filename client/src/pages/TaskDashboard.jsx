import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw, ClipboardList, LogOut, Trash2 } from "lucide-react";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import TaskForm from "@/components/TaskForm";
import { getTasks, deleteTask, updateTask } from "@/services/taskService";
import { Button } from "@/components/ui/button"; // Assuming shared UI components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import ConfirmModal from "@/components/ui/ConfirmModal";

const TaskDashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { logout } = useAuth();
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    const { data: tasks = [], isLoading, isError } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => getTasks() // Pass projectId if needed, currently getting all
    });

    const deleteTaskMutation = useMutation({
        mutationFn: deleteTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success("Task deleted successfully");
        },
        onError: (error) => {
            toast.error(error || "Failed to delete task");
        }
    });

    const updateTaskMutation = useMutation({
        mutationFn: ({ id, status }) => updateTask(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success("Task status updated");
        },
        onError: (error) => {
            toast.error(error || "Failed to update task status");
        }
    });

    const handleDelete = (id) => {
        setTaskToDelete(id);
    };

    const confirmDeleteTask = async () => {
        if (taskToDelete) {
            deleteTaskMutation.mutate(taskToDelete);
            setTaskToDelete(null);
        }
    };

    const handleStatusChange = (id, newStatus) => {
        updateTaskMutation.mutate({ id, status: newStatus });
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex bg-background">
            <BackgroundOrbs />

            {/* Sidebar - Simplified for Project Manager */}
            <aside className="relative z-20 w-64 border-r border-white/10 bg-black/20 backdrop-blur-xl flex flex-col hidden md:flex">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-foreground">
                        Project <span className="text-gradient-primary">Manager</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">Task Management</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 py-4">
                    <button
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/20 text-primary border border-primary/20 transition-all"
                    >
                        <ClipboardList className="w-5 h-5" />
                        <span className="font-medium">Task List</span>
                    </button>
                    {/* Add more links here if needed */}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 border-b border-white/10 bg-black/10 backdrop-blur-md flex items-center justify-between px-4 md:px-8 shrink-0">
                    <h2 className="text-lg font-semibold text-foreground">Task List</h2>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
                            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                            title="Refresh Data"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 md:hidden rounded-lg hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                        {!showTaskForm && (
                            <Button onClick={() => setShowTaskForm(true)} size="sm" className="gap-2">
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Assign New Task</span>
                                <span className="sm:hidden">New</span>
                            </Button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-6xl mx-auto"
                    >
                        {showTaskForm ? (
                            <div className="glass-card p-6">
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Assign New Task</h3>
                                    <Button variant="ghost" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                                </div>
                                <TaskForm
                                    onSuccess={() => setShowTaskForm(false)}
                                    onCancel={() => setShowTaskForm(false)}
                                />
                            </div>
                        ) : (
                            <div className="glass-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                                            <tr>
                                                <th className="p-4 whitespace-nowrap">Timestamp</th>
                                                <th className="p-4 whitespace-nowrap">Work Particulars</th>
                                                <th className="p-4 whitespace-nowrap">Contractor</th>
                                                <th className="p-4 whitespace-nowrap">Planned Start</th>
                                                <th className="p-4 whitespace-nowrap">Planned Finish</th>
                                                <th className="p-4 whitespace-nowrap">Duration</th>
                                                <th className="p-4 whitespace-nowrap">Status</th>
                                                <th className="p-4 whitespace-nowrap">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {isLoading ? (
                                                <tr>
                                                    <td colSpan="8" className="p-8 text-center text-muted-foreground">Loading tasks...</td>
                                                </tr>
                                            ) : tasks.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="p-8 text-center text-muted-foreground">No tasks assigned yet.</td>
                                                </tr>
                                            ) : (
                                                tasks.map((task) => (
                                                    <tr key={task._id} className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 text-muted-foreground whitespace-nowrap">
                                                            {task.createdAt ? format(new Date(task.createdAt), 'dd/MM/yyyy hh:mm a') : '—'}
                                                        </td>
                                                        <td className="p-4 text-foreground">{task.workParticulars || '—'}</td>
                                                        <td className="p-4 text-foreground">{task.contractor?.name || '—'}</td>
                                                        <td className="p-4 text-muted-foreground whitespace-nowrap">
                                                            {task.plannedStartDate ? format(new Date(task.plannedStartDate), 'dd/MM/yyyy') : '—'}
                                                        </td>
                                                        <td className="p-4 text-muted-foreground whitespace-nowrap">
                                                            {task.plannedFinishDate ? format(new Date(task.plannedFinishDate), 'dd/MM/yyyy') : '—'}
                                                        </td>
                                                        <td className="p-4 font-medium">{task.duration ? `${task.duration} Days` : '—'}</td>
                                                        <td className="p-4">
                                                            <Select
                                                                defaultValue={task.status}
                                                                onValueChange={(value) => handleStatusChange(task._id, value)}
                                                            >
                                                                <SelectTrigger className={`w-[130px] h-8 text-xs ${task.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                    task.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                                    }`}>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Pending">Pending</SelectItem>
                                                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                                                    <SelectItem value="Completed">Completed</SelectItem>
                                                                    <SelectItem value="Delayed">Delayed</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                        <td className="p-4">
                                                            <button
                                                                onClick={() => handleDelete(task._id)}
                                                                className="p-1.5 hover:bg-white/20 rounded-lg text-red-400 transition-colors"
                                                                title="Delete Task"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                onConfirm={confirmDeleteTask}
                title="Delete Task?"
                message="Are you sure you want to delete this task? This action cannot be undone."
            />
        </div>
    );
};

export default TaskDashboard;
