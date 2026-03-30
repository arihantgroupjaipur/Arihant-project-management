import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, ClipboardList, LogOut, Trash2, Search, X, Loader2, Receipt, Wallet } from "lucide-react";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import TaskForm from "@/components/TaskForm";
import { getTasks, deleteTask, updateTask } from "@/services/taskService";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import BillsList from "@/components/BillsList";
import PaymentVouchersList from "@/components/PaymentVouchersList";

const PAGE_LIMIT = 20;

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Delayed', label: 'Delayed' },
];

const TaskDashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState("tasks");
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    // ── Search & Filter state ──────────────────────────────────────────────
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");   // debounced value sent to API
    const [statusFilter, setStatusFilter] = useState("all");
    const debounceRef = useRef(null);

    // ── Task list state ──────────────────────────────────────────────────
    const [tasks, setTasks] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // ── Debounce search input (400ms) ──────────────────────────────────────
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearchQuery(searchInput.trim());
        }, 400);
        return () => clearTimeout(debounceRef.current);
    }, [searchInput]);

    // ── Fetch helpers ──────────────────────────────────────────────────────
    const fetchPage = useCallback(async (pg, search, status, append = false) => {
        try {
            append ? setIsLoadingMore(true) : setIsLoading(true);
            const data = await getTasks({ page: pg, limit: PAGE_LIMIT, search, status });
            setTasks(prev => append ? [...prev, ...data.tasks] : data.tasks);
            setHasMore(data.hasMore);
            setTotal(data.total);
            setPage(pg);
        } catch (err) {
            toast.error(err || "Failed to load tasks");
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    // Re-fetch on search/filter change
    useEffect(() => {
        fetchPage(1, searchQuery, statusFilter, false);
    }, [searchQuery, statusFilter, fetchPage]);

    const handleLoadMore = () => fetchPage(page + 1, searchQuery, statusFilter, true);
    const handleRefresh = () => fetchPage(1, searchQuery, statusFilter, false);

    // ── Mutations ──────────────────────────────────────────────────────────
    const deleteTaskMutation = useMutation({
        mutationFn: deleteTask,
        onSuccess: () => {
            toast.success("Task deleted successfully");
            fetchPage(1, searchQuery, statusFilter, false);
        },
        onError: (error) => toast.error(error || "Failed to delete task"),
    });

    const updateTaskMutation = useMutation({
        mutationFn: ({ id, status }) => updateTask(id, { status }),
        onSuccess: (updated) => {
            toast.success("Task status updated");
            // Update row in-place — no full reload needed
            setTasks(prev => prev.map(t => t._id === updated._id ? updated : t));
        },
        onError: (error) => toast.error(error || "Failed to update task status"),
    });

    const handleDelete = (id) => setTaskToDelete(id);
    const confirmDeleteTask = () => { if (taskToDelete) { deleteTaskMutation.mutate(taskToDelete); setTaskToDelete(null); } };
    const handleStatusChange = (id, newStatus) => updateTaskMutation.mutate({ id, status: newStatus });
    const handleLogout = async () => { await logout(); navigate("/login"); };
    const clearSearch = () => { setSearchInput(""); setSearchQuery(""); };

    return (
        <div className="h-screen overflow-hidden relative flex bg-background">
            <BackgroundOrbs />

            {/* Sidebar */}
            <aside className="relative z-20 w-64 border-r border-white/10 bg-black/20 backdrop-blur-xl flex-col hidden md:flex">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-foreground">
                        Project <span className="text-gradient-primary">Manager</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">Task Management</p>
                </div>
                <nav className="flex-1 px-4 space-y-2 py-4">
                    <button onClick={() => setActiveTab("tasks")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "tasks" ? "bg-primary/20 text-primary border border-primary/20" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
                        <ClipboardList className="w-5 h-5" />
                        <span className="font-medium">Task List</span>
                    </button>
                    <button onClick={() => setActiveTab("bills")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "bills" ? "bg-primary/20 text-primary border border-primary/20" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
                        <Receipt className="w-5 h-5" />
                        <span className="font-medium">Bills</span>
                    </button>
                    <button onClick={() => setActiveTab("payment-vouchers")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "payment-vouchers" ? "bg-primary/20 text-primary border border-primary/20" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
                        <Wallet className="w-5 h-5" />
                        <span className="font-medium">Payment Vouchers</span>
                    </button>
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
                    <h2 className="text-lg font-semibold text-foreground">
                        {activeTab === "tasks" && <>Task List{total > 0 && <span className="ml-2 text-xs text-muted-foreground font-normal">({total} total)</span>}</>}
                        {activeTab === "bills" && "Bills"}
                        {activeTab === "payment-vouchers" && "Payment Vouchers"}
                    </h2>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={handleRefresh}
                            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                            title="Refresh Data"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 md:hidden rounded-lg hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                        <Button
                            type="button"
                            onClick={() => setShowTaskForm(v => !v)}
                            size="sm"
                            variant={showTaskForm ? "outline" : "default"}
                            className="gap-2"
                        >
                            {showTaskForm ? (
                                <>
                                    <X className="w-4 h-4" />
                                    <span className="hidden sm:inline">Cancel</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Assign New Task</span>
                                    <span className="sm:hidden">New</span>
                                </>
                            )}
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-6xl mx-auto"
                    >
                        {activeTab === "bills" && <BillsList />}
                        {activeTab === "payment-vouchers" && <PaymentVouchersList />}
                        {activeTab === "tasks" && (showTaskForm ? (
                            <div className="glass-card p-6">
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Assign New Task</h3>
                                    <Button variant="ghost" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                                </div>
                                <TaskForm
                                    onSuccess={() => { setShowTaskForm(false); handleRefresh(); }}
                                    onCancel={() => setShowTaskForm(false)}
                                />
                            </div>
                        ) : (
                            <>
                                {/* ── Search & Filter bar ─────────────────────────── */}
                                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                        <input
                                            type="text"
                                            value={searchInput}
                                            onChange={e => setSearchInput(e.target.value)}
                                            placeholder="Search task ID or description..."
                                            className="w-full pl-9 pr-8 py-2.5 rounded-lg bg-black/20 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                                        />
                                        {searchInput && (
                                            <button
                                                onClick={clearSearch}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full sm:w-44 bg-black/20 border-white/10 text-sm h-auto py-2.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map(o => (
                                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* ── Table ─────────────────────────────────────── */}
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
                                                        <td colSpan="8" className="p-8 text-center text-muted-foreground">
                                                            <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                                                            Loading tasks...
                                                        </td>
                                                    </tr>
                                                ) : tasks.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="8" className="p-8 text-center text-muted-foreground">
                                                            {searchQuery || statusFilter !== 'all'
                                                                ? 'No tasks match your search.'
                                                                : 'No tasks assigned yet.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    tasks.map((task) => (
                                                        <tr key={task._id} className="hover:bg-white/5 transition-colors">
                                                            <td className="p-4 text-muted-foreground whitespace-nowrap">
                                                                {task.createdAt ? format(new Date(task.createdAt), 'dd/MM/yyyy hh:mm:ss a') : '—'}
                                                            </td>
                                                            <td className="p-4 text-foreground">{task.workParticulars || '—'}</td>
                                                            <td className="p-4 text-foreground">{task.contractor?.name || task.contractorName || '—'}</td>
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
                                                                            task.status === 'Delayed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
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

                                    {/* ── Load More button ───────────────────────── */}
                                    {hasMore && (
                                        <div className="flex justify-center p-4 border-t border-white/10">
                                            <button
                                                onClick={handleLoadMore}
                                                disabled={isLoadingMore}
                                                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                                            >
                                                {isLoadingMore ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" />Loading...</>
                                                ) : (
                                                    `Load More (${total - tasks.length} remaining)`
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {/* All loaded indicator */}
                                    {!hasMore && tasks.length > 0 && (
                                        <p className="text-center text-xs text-muted-foreground py-3 border-t border-white/10">
                                            All {total} task{total !== 1 ? 's' : ''} loaded
                                        </p>
                                    )}
                                </div>
                            </>
                        ))}
                    </motion.div>
                </div>
            </main>

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
