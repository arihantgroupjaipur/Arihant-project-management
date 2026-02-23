import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    LogOut,
    ClipboardList,
    HardHat,
    CheckCircle,
    Truck,
    Menu,
    X,
    FileText
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import FloatingInput from "@/components/FloatingInput";
import DailyProgressTable from "@/components/DailyProgressTable";
import MaterialConsumptionTable from "@/components/MaterialConsumptionTable";
import PreviousEntries from "@/components/PreviousEntries";
import WorkOrderForm from "@/components/WorkOrderForm";
import WorkCompletionForm from "@/components/WorkCompletionForm";
import IndentForm from "@/components/IndentForm";
import { entryService } from "@/services/entryService";
import { useAuth } from "@/context/AuthContext";

const EngineerDashboard = () => {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("dailyDeploy"); // dailyDeploy, workOrder, qaqc, indent, history

    // Daily Deployment State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [entries, setEntries] = useState([]);

    const [formData, setFormData] = useState({
        date: "",
        projectName: "",
        location: "",
        supervisor: "",
    });
    const [dailyProgressRows, setDailyProgressRows] = useState([
        { contractorName: "", workOrderNo: "", plannedLabour: "", actualLabour: "", plannedWork: "", actualWork: "", status: "" },
    ]);
    const [materialConsumptionRows, setMaterialConsumptionRows] = useState([
        { materialName: "", totalQuantity: "", unit: "", workOrderReference: "" },
    ]);

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        try {
            const data = await entryService.getAll();
            setEntries(data);
        } catch (error) {
            console.error('Error loading entries:', error);
            toast.error('Failed to load entries');
        }
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleWorkOrderSelect = (workOrder) => {
        setFormData(prev => ({
            ...prev,
            projectName: prev.projectName || workOrder.workLocationName || "",
            location: prev.location || workOrder.addressLocation || "",
            supervisor: prev.supervisor || workOrder.storeKeeperSupervisorName || "",
        }));
    };

    const handleSubmitDeployment = async (e) => {
        e.preventDefault();
        if (!formData.date || !formData.projectName || !formData.location || !formData.supervisor) {
            toast.error("Please fill all required fields");
            return;
        }

        const validDailyRows = dailyProgressRows.filter(row => row.contractorName.trim() !== "");
        if (validDailyRows.length === 0) {
            toast.error("Please add at least one entry in Daily Progress Reports");
            return;
        }
        setIsSubmitting(true);

        try {
            const totalWorkers = validDailyRows.reduce((sum, row) => sum + (typeof row.actualLabour === 'number' ? row.actualLabour : 0), 0);
            const labourDetailsMap = new Map();

            validDailyRows.forEach(row => {
                if (!labourDetailsMap.has(row.contractorName)) {
                    labourDetailsMap.set(row.contractorName, {
                        contractorName: row.contractorName,
                        plannedLabour: 0,
                        actualLabour: 0
                    });
                }
                const entry = labourDetailsMap.get(row.contractorName);
                entry.plannedLabour += (typeof row.plannedLabour === 'number' ? row.plannedLabour : 0);
                entry.actualLabour += (typeof row.actualLabour === 'number' ? row.actualLabour : 0);
            });

            const aggregatedLabourDetails = Array.from(labourDetailsMap.values());

            await entryService.create({
                date: formData.date,
                projectName: formData.projectName,
                location: formData.location,
                supervisor: formData.supervisor,
                status: "active",
                workerCount: totalWorkers,
                labourDetails: aggregatedLabourDetails,
                dailyProgressReports: validDailyRows.map(row => ({
                    ...row,
                    plannedLabour: typeof row.plannedLabour === 'number' ? row.plannedLabour : 0,
                    actualLabour: typeof row.actualLabour === 'number' ? row.actualLabour : 0,
                })),
                materialConsumption: materialConsumptionRows.filter(row => row.materialName.trim() !== "").map(row => ({
                    ...row,
                    totalQuantity: typeof row.totalQuantity === 'number' ? row.totalQuantity : 0,
                })),
            });

            await loadEntries();

            setIsSubmitting(false);
            setIsSuccess(true);
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ["#22c55e", "#10b981", "#34d399"],
            });
            toast.success("Deployment submitted successfully!");

            setTimeout(() => {
                setIsSuccess(false);
                setFormData({
                    date: "",
                    projectName: "",
                    location: "",
                    supervisor: "",
                });
                setDailyProgressRows([{ contractorName: "", workOrderNo: "", plannedLabour: "", actualLabour: "", plannedWork: "", actualWork: "", status: "" }]);
                setMaterialConsumptionRows([{ materialName: "", totalQuantity: "", unit: "", workOrderReference: "" }]);
            }, 2000);
        } catch (error) {
            setIsSubmitting(false);
            console.error('Error submitting entry:', error);
            toast.error(error.response?.data?.message || 'Failed to submit deployment');
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const menuItems = [
        { id: "dailyDeploy", label: "Daily Deployment", icon: ClipboardList },
        { id: "workOrder", label: "Work Order", icon: FileText },
        { id: "workCompletion", label: "Work Completion & Certification", icon: CheckCircle },
        { id: "indent", label: "Indent Form", icon: Truck },
        { id: "history", label: "View History", icon: HardHat },
    ];

    return (
        <div className="min-h-screen relative overflow-hidden flex bg-background">
            <BackgroundOrbs />

            {/* Mobile Sidebar Toggle */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white"
            >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-64 border-r border-white/10 bg-black/20 backdrop-blur-xl flex flex-col transform transition-transform duration-300 md:translate-x-0 md:static
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-foreground">
                        Site <span className="text-gradient-secondary">Engineer</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">Dashboard</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 py-4">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                                    ? "bg-secondary/20 text-secondary border border-secondary/20"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        );
                    })}
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
                        {menuItems.find(item => item.id === activeTab)?.label}
                    </h2>
                    <div className="text-sm text-muted-foreground hidden md:block">
                        Welcome, {user?.fullName || 'Engineer'}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="max-w-4xl mx-auto"
                    >
                        {activeTab === "dailyDeploy" && (
                            <div className="glass-card p-6 md:p-8">
                                <h3 className="text-xl font-semibold mb-6">New Daily Deployment Entry</h3>
                                <form onSubmit={handleSubmitDeployment} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FloatingInput type="date" label="Date" value={formData.date} onChange={(e) => handleInputChange("date", e.target.value)} />
                                        <FloatingInput type="text" label="Site / Project Name" value={formData.projectName} onChange={(e) => handleInputChange("projectName", e.target.value)} />
                                        <FloatingInput type="text" label="Location" value={formData.location} onChange={(e) => handleInputChange("location", e.target.value)} />
                                        <FloatingInput type="text" label="Supervisor Name" value={formData.supervisor} onChange={(e) => handleInputChange("supervisor", e.target.value)} />
                                    </div>

                                    <DailyProgressTable
                                        rows={dailyProgressRows}
                                        onChange={setDailyProgressRows}
                                        onWorkOrderSelect={handleWorkOrderSelect}
                                    />

                                    <MaterialConsumptionTable rows={materialConsumptionRows} onChange={setMaterialConsumptionRows} />

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || isSuccess}
                                        className="w-full py-3 rounded-xl font-semibold bg-secondary text-secondary-foreground hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        {isSubmitting ? "Submitting..." : isSuccess ? "Done!" : "Submit Deployment"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === "workOrder" && (
                            <div className="glass-card p-6 md:p-8">
                                <WorkOrderForm onSuccess={() => setActiveTab("history")} />
                            </div>
                        )}

                        {activeTab === "workCompletion" && (
                            <div className="glass-card p-6 md:p-8">
                                <WorkCompletionForm onSuccess={() => setActiveTab("history")} />
                            </div>
                        )}

                        {activeTab === "indent" && (
                            <div className="glass-card p-6 md:p-8">
                                <IndentForm onSuccess={() => setActiveTab("history")} />
                            </div>
                        )}

                        {activeTab === "history" && (
                            <PreviousEntries entries={entries} />
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default EngineerDashboard;
