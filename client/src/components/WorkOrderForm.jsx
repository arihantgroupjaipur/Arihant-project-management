import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import SignaturePad from "@/components/SignaturePad";
import workOrderService from "@/services/workOrderService";
import { getTasksAll } from "@/services/taskService";

const WorkOrderForm = ({ onSuccess, initialData = null }) => {
    const contractorSigRef = useRef(null);
    const engineerSigRef = useRef(null);
    const supervisorSigRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [woNumberError, setWoNumberError] = useState("");
    const [tasks, setTasks] = useState([]);
    const [taskSearch, setTaskSearch] = useState("");
    const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);
    const taskDropdownRef = useRef(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        workOrderNumber: "",
        mainWorkOrderReference: "",
        taskReference: "",
        addressLocation: "",
        contactPersonName: "",
        workLocationName: "",
        storeKeeperSupervisorName: "",
        comments: "",
    });

    // Close task dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (taskDropdownRef.current && !taskDropdownRef.current.contains(e.target)) {
                setTaskDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Populate form data if initialData is provided
    useEffect(() => {
        if (initialData) {
            setFormData({
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                workOrderNumber: initialData.workOrderNumber || "",
                mainWorkOrderReference: initialData.mainWorkOrderReference || "",
                taskReference: initialData.taskReference || "",
                addressLocation: initialData.addressLocation || "",
                contactPersonName: initialData.contactPersonName || "",
                workLocationName: initialData.workLocationName || "",
                storeKeeperSupervisorName: initialData.storeKeeperSupervisorName || "",
                comments: initialData.comments || "",
            });

            if (initialData.workItems && initialData.workItems.length > 0) {
                // Ensure dates are formatted correctly for the inputs
                const formattedItems = initialData.workItems.map(item => ({
                    ...item,
                    workStartDate: item.workStartDate ? new Date(item.workStartDate).toISOString().split('T')[0] : "",
                    workFinishDate: item.workFinishDate ? new Date(item.workFinishDate).toISOString().split('T')[0] : ""
                }));
                setWorkItems(formattedItems);
            }

            // Load signatures into the canvas refs
            setTimeout(() => {
                if (initialData.signatures?.contractor && contractorSigRef.current) {
                    contractorSigRef.current.fromDataURL(initialData.signatures.contractor);
                }
                if (initialData.signatures?.engineer && engineerSigRef.current) {
                    engineerSigRef.current.fromDataURL(initialData.signatures.engineer);
                }
                if (initialData.signatures?.supervisor && supervisorSigRef.current) {
                    supervisorSigRef.current.fromDataURL(initialData.signatures.supervisor);
                }
            }, 100);
        }
    }, [initialData]);

    const [workItems, setWorkItems] = useState([
        {
            workDescription: "",
            plannedLabour: "",
            workStartDate: "",
            workFinishDate: "",
            workArea: "",
            rate: "",
            totalAmount: "",
        },
    ]);

    // Fetch available tasks on mount
    useEffect(() => {
        const fetchTasksList = async () => {
            try {
                setTasks(await getTasksAll());
            } catch (error) {
                console.error("Failed to fetch tasks for dropdown:", error);
                toast.error("Failed to load task references");
            }
        };
        fetchTasksList();
    }, []);

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (field === "workOrderNumber") setWoNumberError("");
    };

    const checkWoNumberUnique = async (value) => {
        if (!value) return;
        // Skip check when editing and number hasn't changed
        if (initialData && initialData.workOrderNumber === value) return;
        try {
            const data = await workOrderService.getAllWorkOrders({ limit: 1000 });
            const exists = (data.workOrders || []).some(wo => wo.workOrderNumber === value);
            if (exists) setWoNumberError("This Work Order Number already exists.");
        } catch {
            // silently ignore
        }
    };

    const handleWorkItemChange = (index, field, value) => {
        const updatedItems = [...workItems];
        updatedItems[index][field] = value;

        // Auto-calculate total amount if rate or area changed (not if user edited totalAmount directly)
        if (field === 'rate' || field === 'workArea') {
            const rate = parseFloat(updatedItems[index].rate) || 0;
            const area = parseFloat(updatedItems[index].workArea) || 0;
            updatedItems[index].totalAmount = (rate * area).toString();
        }

        setWorkItems(updatedItems);
    };

    const addWorkItem = () => {
        setWorkItems([
            ...workItems,
            {
                workDescription: "",
                plannedLabour: "",
                workStartDate: "",
                workFinishDate: "",
                workArea: "",
                rate: "",
                totalAmount: "",
            },
        ]);
    };

    const removeWorkItem = (index) => {
        if (workItems.length > 1) {
            setWorkItems(workItems.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.workOrderNumber) {
            toast.error("Work Order Number is required");
            return;
        }
        if (woNumberError) {
            toast.error("Work Order Number already exists. Please use a unique number.");
            return;
        }
        if (!formData.addressLocation) {
            toast.error("Address/Location is required");
            return;
        }
        if (!formData.contactPersonName) {
            toast.error("Contact Person Name is required");
            return;
        }
        if (!formData.workLocationName) {
            toast.error("Work Location Name is required");
            return;
        }

        // Validate work items
        if (workItems.length === 0) {
            toast.error("At least one work item is required");
            return;
        }

        for (let i = 0; i < workItems.length; i++) {
            const item = workItems[i];
            if (!item.workDescription || !item.plannedLabour || !item.workStartDate ||
                !item.workFinishDate || !item.workArea) {
                toast.error(`Please fill all fields in work item ${i + 1}`);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // Get signature data
            const signatures = {
                contractor: contractorSigRef.current?.isEmpty() ? null : contractorSigRef.current?.toDataURL(),
                engineer: engineerSigRef.current?.isEmpty() ? null : engineerSigRef.current?.toDataURL(),
                supervisor: supervisorSigRef.current?.isEmpty() ? null : supervisorSigRef.current?.toDataURL(),
            };

            const workOrderData = {
                ...formData,
                date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
                workItems,
                signatures,
            };

            if (initialData && initialData._id) {
                await workOrderService.updateWorkOrder(initialData._id, workOrderData);
                toast.success("Work Order updated successfully!");
            } else {
                await workOrderService.createWorkOrder(workOrderData);
                toast.success("Work Order created successfully!");
            }

            // Call onSuccess callback if provided
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Error saving work order:", error);
            toast.error(error.response?.data?.message || "Failed to save work order");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Header */}
            <div className="border-b border-white/10 pb-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <img src="/arihantlogo.png" alt="Arihant Logo" className="h-12 w-12 object-contain" />
                    <h2 className="text-xl md:text-2xl font-bold text-center flex-1">
                        Arihant Dream Infra Projects Ltd. Jaipur
                    </h2>
                </div>
                <div className="text-center space-y-1 text-xs md:text-sm text-muted-foreground">
                    <p>2nd Floor, Class Of Pearl, Income Tax Colony, Tonk Road, Durgapura, Jaipur, Rajasthan, 302018 (Pan - AAICA5226A)</p>
                    <p>CIN No. U7010RJ2011PLC035322</p>
                </div>
                <h3 className="text-xl font-bold text-center mt-4 mb-6">Work Order</h3>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Website: www.arihantgroupjaipur.com</p>
                        <p className="text-muted-foreground">Email: info@arihantgroupjaipur.com - Legacy@arihantgroupjaipur.com</p>
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="text-muted-foreground block mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => handleInputChange("date", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-muted-foreground block mb-1">Work Order Number</label>
                            <input
                                type="text"
                                value={formData.workOrderNumber}
                                onChange={(e) => handleInputChange("workOrderNumber", e.target.value)}
                                onBlur={(e) => checkWoNumberUnique(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-foreground focus:outline-none focus:ring-2 ${woNumberError ? "border-red-500/60 focus:ring-red-500/50" : "border-white/10 focus:ring-purple-500/50"}`}
                                placeholder="Enter work order number"
                            />
                            {woNumberError && <p className="text-red-400 text-xs mt-1">{woNumberError}</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Main Work Order Reference
                    </label>
                    <input
                        type="text"
                        value={formData.mainWorkOrderReference}
                        onChange={(e) => handleInputChange("mainWorkOrderReference", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="Enter main work order reference"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Task Reference <span className="text-xs text-blue-400 font-normal">(TK-XXXXXX)</span>
                    </label>
                    <div className="relative" ref={taskDropdownRef}>
                        {/* Trigger button */}
                        <button
                            type="button"
                            onClick={() => { setTaskDropdownOpen(o => !o); setTaskSearch(""); }}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#1a1b26] border border-blue-500/20 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-colors hover:bg-[#1f202e] cursor-pointer"
                        >
                            <span className={formData.taskReference ? "text-foreground" : "text-muted-foreground"}>
                                {formData.taskReference
                                    ? (() => { const t = tasks.find(t => t.taskId === formData.taskReference); return t ? `${t.taskId} — ${t.workParticulars}` : formData.taskReference; })()
                                    : "Select a Task"}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {formData.taskReference && (
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => { e.stopPropagation(); handleInputChange("taskReference", ""); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleInputChange("taskReference", ""); } }}
                                        className="text-muted-foreground hover:text-red-400 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </span>
                                )}
                                <svg className={`w-4 h-4 text-muted-foreground transition-transform ${taskDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </button>

                        {/* Dropdown panel */}
                        {taskDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full rounded-lg bg-[#1a1a2e] border border-blue-500/20 shadow-2xl shadow-black/50 overflow-hidden">
                                {/* Search input */}
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                                    <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={taskSearch}
                                        onChange={(e) => setTaskSearch(e.target.value)}
                                        placeholder="Search task ID or description..."
                                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                                    />
                                    {taskSearch && (
                                        <button type="button" onClick={() => setTaskSearch("")} className="text-muted-foreground hover:text-foreground">
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                {/* Options list */}
                                <div className="max-h-52 overflow-y-auto">
                                    {/* Clear option */}
                                    <button
                                        type="button"
                                        onClick={() => { handleInputChange("taskReference", ""); setTaskDropdownOpen(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-white/5 transition-colors"
                                    >
                                        — No Task Linked —
                                    </button>

                                    {tasks
                                        .filter(t => {
                                            const q = taskSearch.toLowerCase();
                                            return !q || t.taskId?.toLowerCase().includes(q) || t.workParticulars?.toLowerCase().includes(q);
                                        })
                                        .map(t => (
                                            <button
                                                key={t._id}
                                                type="button"
                                                onClick={() => { handleInputChange("taskReference", t.taskId); setTaskDropdownOpen(false); }}
                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-blue-500/10 ${formData.taskReference === t.taskId ? 'bg-blue-500/15 text-blue-300' : 'text-foreground'
                                                    }`}
                                            >
                                                <span className="font-medium text-blue-400">{t.taskId}</span>
                                                <span className="text-muted-foreground ml-2">— {t.workParticulars}</span>
                                            </button>
                                        ))
                                    }

                                    {tasks.filter(t => {
                                        const q = taskSearch.toLowerCase();
                                        return !q || t.taskId?.toLowerCase().includes(q) || t.workParticulars?.toLowerCase().includes(q);
                                    }).length === 0 && (
                                            <p className="px-4 py-3 text-sm text-muted-foreground text-center">No tasks found</p>
                                        )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Address/Location
                    </label>
                    <input
                        type="text"
                        value={formData.addressLocation}
                        onChange={(e) => handleInputChange("addressLocation", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="Enter address/location"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Contact Person Name
                    </label>
                    <input
                        type="text"
                        value={formData.contactPersonName}
                        onChange={(e) => handleInputChange("contactPersonName", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="Enter contact person name"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Work Location Name
                    </label>
                    <input
                        type="text"
                        value={formData.workLocationName}
                        onChange={(e) => handleInputChange("workLocationName", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="Enter work location name"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Store Keeper & Supervisor Name
                    </label>
                    <input
                        type="text"
                        value={formData.storeKeeperSupervisorName}
                        onChange={(e) => handleInputChange("storeKeeperSupervisorName", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="Enter store keeper & supervisor name"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Comments or Special Instructions
                    </label>
                    <textarea
                        value={formData.comments}
                        onChange={(e) => handleInputChange("comments", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[100px]"
                        placeholder="Enter comments or special instructions"
                    />
                </div>
            </div>

            {/* Work Items Table */}
            <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Work Details</h3>
                    <motion.button
                        type="button"
                        onClick={addWorkItem}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Plus className="w-4 h-4" />
                        Add Row
                    </motion.button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left p-2 text-muted-foreground font-medium">Work Description</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">No Of Planned Labour</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Work Start Date</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Work Finish Date</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Work Area</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Rate</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Total Amount</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workItems.map((item, index) => (
                                <tr key={index} className="border-b border-white/5">
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            value={item.workDescription}
                                            onChange={(e) => handleWorkItemChange(index, "workDescription", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                            placeholder="Description"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            value={item.plannedLabour}
                                            onChange={(e) => handleWorkItemChange(index, "plannedLabour", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                            placeholder="Labour"
                                            min="0"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="date"
                                            value={item.workStartDate}
                                            onChange={(e) => handleWorkItemChange(index, "workStartDate", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="date"
                                            value={item.workFinishDate}
                                            onChange={(e) => handleWorkItemChange(index, "workFinishDate", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            value={item.workArea}
                                            onChange={(e) => handleWorkItemChange(index, "workArea", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                            placeholder="Area"
                                            step="0.01"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            value={item.rate}
                                            onChange={(e) => handleWorkItemChange(index, "rate", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                            placeholder="Rate"
                                            step="0.01"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            value={item.totalAmount}
                                            onChange={(e) => handleWorkItemChange(index, "totalAmount", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                            placeholder="Auto / Manual"
                                            step="0.01"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <button
                                            type="button"
                                            onClick={() => removeWorkItem(index)}
                                            disabled={workItems.length === 1}
                                            className="p-1 text-red-400 hover:bg-red-500/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Signature Section */}
            <div className="border-t border-white/10 pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">Signatures</h3>
                <div className="grid md:grid-cols-3 gap-6">
                    <SignaturePad ref={contractorSigRef} label="Signature Of Contractor" />
                    <SignaturePad ref={engineerSigRef} label="Signature Of Site Engineer" />
                    <SignaturePad ref={supervisorSigRef} label="Signature Of Site Supervisor" />
                </div>
            </div>

            {/* Note */}
            <div className="border-t border-white/10 pt-4">
                <p className="text-xs text-muted-foreground italic">
                    अतिरिक्त नोट : 1. बिल जमा करते समय कार्य आदेश (Work Order) की प्रति संलग्न करना आवश्यक है। 2.
                    कार्य में किसी भी प्रकार की त्रुटि का दायित्व ठेकेदार का है और सुधार का कार्य करना है। 3. कार्य का वर्क आर्डर के अनुसार
                    गुणवत्ता मानक के अनुसार करना है। 4. हाउसकीपिंग और सफाई का कार्य करना है।
                </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 mt-6">
                <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl font-semibold bg-purple-500 text-white hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                    whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            {initialData ? "Updating..." : "Creating..."}
                        </>
                    ) : (
                        initialData ? "Update Work Order" : "Create Work Order"
                    )}
                </motion.button>
            </div>
        </form>
    );
};

export default WorkOrderForm;
