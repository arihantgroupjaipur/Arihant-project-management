import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Send } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import FloatingInput from "@/components/FloatingInput";
import DailyProgressTable from "@/components/DailyProgressTable";
import MaterialConsumptionTable from "@/components/MaterialConsumptionTable";
import { entryService } from "@/services/entryService";
import { workOrderService } from "@/services/workOrderService";
import { getSiteLookups } from "@/services/siteLookupService";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const DailyDeploymentForm = ({ onSuccess, initialData }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [workOrders, setWorkOrders] = useState([]);
    const [siteNames, setSiteNames] = useState([]);
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
        workOrderService.getAllWorkOrders()
            .then(setWorkOrders)
            .catch(err => console.error("Failed to fetch work orders", err));

        getSiteLookups('siteName')
            .then(data => setSiteNames(data.map(item => item.value)))
            .catch(err => console.error("Failed to fetch site names", err));
    }, []);

    // Pre-fill form when editing
    useEffect(() => {
        if (initialData) {
            setFormData({
                date: initialData.date || "",
                projectName: initialData.projectName || "",
                location: initialData.location || "",
                supervisor: initialData.supervisor || "",
            });
            if (initialData.dailyProgressReports?.length > 0) {
                setDailyProgressRows(initialData.dailyProgressReports);
            }
            if (initialData.materialConsumption?.length > 0) {
                setMaterialConsumptionRows(initialData.materialConsumption);
            }
        }
    }, [initialData]);

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSiteSelect = (workOrderNumber) => {
        const wo = workOrders.find(w => w.workOrderNumber === workOrderNumber);
        if (wo) {
            setFormData(prev => ({
                ...prev,
                projectName: workOrderNumber,
                location: wo.workLocationName || wo.addressLocation || prev.location,
                supervisor: wo.storeKeeperSupervisorName || prev.supervisor,
            }));
        }
    };

    const handleWorkOrderSelect = (workOrder) => {
        setFormData(prev => ({
            ...prev,
            location: prev.location || workOrder.workLocationName || workOrder.addressLocation || "",
            supervisor: prev.supervisor || workOrder.storeKeeperSupervisorName || "",
        }));
    };

    const handleSubmit = async (e) => {
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

            const payload = {
                date: formData.date,
                projectName: formData.projectName,
                location: formData.location,
                supervisor: formData.supervisor,
                status: "active",
                workerCount: totalWorkers,
                labourDetails: Array.from(labourDetailsMap.values()),
                dailyProgressReports: validDailyRows.map(row => ({
                    ...row,
                    plannedLabour: typeof row.plannedLabour === 'number' ? row.plannedLabour : 0,
                    actualLabour: typeof row.actualLabour === 'number' ? row.actualLabour : 0,
                })),
                materialConsumption: materialConsumptionRows
                    .filter(row => row.materialName.trim() !== "")
                    .map(row => ({
                        ...row,
                        totalQuantity: typeof row.totalQuantity === 'number' ? row.totalQuantity : 0,
                    })),
            };

            if (initialData?._id) {
                await entryService.update(initialData._id, payload);
                toast.success("Deployment updated successfully!");
            } else {
                await entryService.create(payload);
                toast.success("Daily Deployment submitted successfully!");
            }

            onSuccess?.();
        } catch (error) {
            console.error('Error submitting entry:', error);
            toast.error(error.response?.data?.message || 'Failed to submit deployment');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FloatingInput
                        type="date"
                        label="Date"
                        value={formData.date}
                        onChange={(e) => handleInputChange("date", e.target.value)}
                    />
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Site <span className="text-red-400">*</span>
                        </label>
                        <div className="relative flex w-full items-stretch rounded-lg bg-black/20 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-primary/50">
                            <input
                                type="text"
                                value={formData.projectName}
                                onChange={(e) => handleInputChange("projectName", e.target.value)}
                                placeholder="Type or select site..."
                                className="flex-1 bg-transparent px-4 py-3 text-foreground focus:outline-none text-sm h-11"
                            />
                            <DropdownMenu>
                                <DropdownMenuTrigger type="button" className="flex items-center justify-center px-3 border-l border-white/10 hover:bg-white/5 transition-colors group">
                                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px] border-white/10 bg-[#1e1e2d] z-[9999] max-h-[300px] overflow-y-auto">
                                    {siteNames.map(s => (
                                        <DropdownMenuItem key={s} onClick={() => handleInputChange("projectName", s)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer text-sm">
                                            {s}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <FloatingInput
                        type="text"
                        label="Location"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                    />
                    <FloatingInput
                        type="text"
                        label="Supervisor Name"
                        value={formData.supervisor}
                        onChange={(e) => handleInputChange("supervisor", e.target.value)}
                    />
                </div>
            </div>

            <div className="border-t border-white/10 pt-6">
                <DailyProgressTable
                    rows={dailyProgressRows}
                    onChange={setDailyProgressRows}
                    onWorkOrderSelect={handleWorkOrderSelect}
                />
            </div>

            <div className="border-t border-white/10 pt-6">
                <MaterialConsumptionTable
                    rows={materialConsumptionRows}
                    onChange={setMaterialConsumptionRows}
                />
            </div>

            <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}
            >
                {isSubmitting ? (initialData?._id ? "Updating..." : "Submitting...") : (
                    <>
                        <Send className="w-4 h-4" />
                        {initialData?._id ? "Update Deployment" : "Submit Deployment"}
                    </>
                )}
            </motion.button>
        </form>
    );
};

export default DailyDeploymentForm;
