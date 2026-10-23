import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import SignaturePad from "@/components/SignaturePad";
import workOrderService from "@/services/workOrderService";
import { getTasksAll } from "@/services/taskService";

const emptyWorkItem = () => ({ workDescription: "", floor: "", workStartDate: "", workFinishDate: "", revisedDate: "" });
const emptyRefDrawing = () => ({ revisionDate: "", specification: "", attached: "" });

const WorkOrderForm = ({ onSuccess, initialData = null }) => {
    const preparedSigRef = useRef(null);
    const acceptedSigRef = useRef(null);
    const authorizedSigRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [woNumberError, setWoNumberError] = useState("");
    const [tasks, setTasks] = useState([]);
    const [taskSearch, setTaskSearch] = useState("");
    const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);
    const taskDropdownRef = useRef(null);

    const [formData, setFormData] = useState({
        workOrderNumber: "",
        date: new Date().toISOString().split('T')[0],
        projectName: "",
        siteLocation: "",
        issuedBy: "",
        issuedTo: "",
        contractType: "",
        block: "",
        startDate: "",
        validTill: "",
        taskReference: "",
        preparedVerifiedByName: "",
        preparedVerifiedByDate: "",
        acceptedByName: "",
        acceptedByDate: "",
        authorizedByName: "",
        authorizedByDate: "",
    });

    const [workItems, setWorkItems] = useState([emptyWorkItem()]);
    const [referenceDrawings, setReferenceDrawings] = useState([emptyRefDrawing()]);
    const [resources, setResources] = useState({
        labourMason: "",
        labourBeldarCull: "",
        supervisorForeman: "",
        engineerInCharge: "",
        equipmentMachinery: "",
        materialIssued: "",
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
                workOrderNumber: initialData.workOrderNumber || "",
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                projectName: initialData.projectName || "",
                siteLocation: initialData.siteLocation || "",
                issuedBy: initialData.issuedBy || "",
                issuedTo: initialData.issuedTo || "",
                contractType: initialData.contractType || "",
                block: initialData.block || "",
                startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
                validTill: initialData.validTill ? new Date(initialData.validTill).toISOString().split('T')[0] : "",
                taskReference: initialData.taskReference || "",
                preparedVerifiedByName: initialData.signatures?.preparedVerifiedBy?.name || "",
                preparedVerifiedByDate: initialData.signatures?.preparedVerifiedBy?.date ? new Date(initialData.signatures.preparedVerifiedBy.date).toISOString().split('T')[0] : "",
                acceptedByName: initialData.signatures?.acceptedBy?.name || "",
                acceptedByDate: initialData.signatures?.acceptedBy?.date ? new Date(initialData.signatures.acceptedBy.date).toISOString().split('T')[0] : "",
                authorizedByName: initialData.signatures?.authorizedBy?.name || "",
                authorizedByDate: initialData.signatures?.authorizedBy?.date ? new Date(initialData.signatures.authorizedBy.date).toISOString().split('T')[0] : "",
            });

            if (initialData.workItems?.length > 0) {
                setWorkItems(initialData.workItems.map((item) => ({
                    workDescription: item.workDescription || "",
                    floor: item.floor || "",
                    workStartDate: item.workStartDate ? new Date(item.workStartDate).toISOString().split('T')[0] : "",
                    workFinishDate: item.workFinishDate ? new Date(item.workFinishDate).toISOString().split('T')[0] : "",
                    revisedDate: item.revisedDate ? new Date(item.revisedDate).toISOString().split('T')[0] : "",
                })));
            }

            if (initialData.referenceDrawings?.length > 0) {
                setReferenceDrawings(initialData.referenceDrawings.map((r) => ({
                    revisionDate: r.revisionDate || "",
                    specification: r.specification || "",
                    attached: r.attached || "",
                })));
            }

            if (initialData.resources) {
                setResources({
                    labourMason: initialData.resources.labourMason || "",
                    labourBeldarCull: initialData.resources.labourBeldarCull || "",
                    supervisorForeman: initialData.resources.supervisorForeman || "",
                    engineerInCharge: initialData.resources.engineerInCharge || "",
                    equipmentMachinery: initialData.resources.equipmentMachinery || "",
                    materialIssued: initialData.resources.materialIssued || "",
                });
            }

            // Load signatures into the canvas refs
            setTimeout(() => {
                if (initialData.signatures?.preparedVerifiedBy?.signature && preparedSigRef.current) {
                    preparedSigRef.current.fromDataURL(initialData.signatures.preparedVerifiedBy.signature);
                }
                if (initialData.signatures?.acceptedBy?.signature && acceptedSigRef.current) {
                    acceptedSigRef.current.fromDataURL(initialData.signatures.acceptedBy.signature);
                }
                if (initialData.signatures?.authorizedBy?.signature && authorizedSigRef.current) {
                    authorizedSigRef.current.fromDataURL(initialData.signatures.authorizedBy.signature);
                }
            }, 100);
        }
    }, [initialData]);

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
        const updated = [...workItems];
        updated[index] = { ...updated[index], [field]: value };
        setWorkItems(updated);
    };
    const addWorkItem = () => setWorkItems([...workItems, emptyWorkItem()]);
    const removeWorkItem = (index) => {
        if (workItems.length > 1) setWorkItems(workItems.filter((_, i) => i !== index));
    };

    const handleRefDrawingChange = (index, field, value) => {
        const updated = [...referenceDrawings];
        updated[index] = { ...updated[index], [field]: value };
        setReferenceDrawings(updated);
    };
    const addRefDrawing = () => setReferenceDrawings([...referenceDrawings, emptyRefDrawing()]);
    const removeRefDrawing = (index) => {
        if (referenceDrawings.length > 1) setReferenceDrawings(referenceDrawings.filter((_, i) => i !== index));
    };

    const handleResourceChange = (field, value) => setResources((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.workOrderNumber) {
            toast.error("Work Order Number is required");
            return;
        }
        if (woNumberError) {
            toast.error("Work Order Number already exists. Please use a unique number.");
            return;
        }
        if (!formData.projectName) {
            toast.error("Project Name is required");
            return;
        }
        if (!formData.siteLocation) {
            toast.error("Site Location is required");
            return;
        }

        const validItems = workItems.filter((i) => i.workDescription);
        if (validItems.length === 0) {
            toast.error("Add at least one row with a Description of Work");
            return;
        }

        setIsSubmitting(true);
        try {
            const signatures = {
                preparedVerifiedBy: {
                    name: formData.preparedVerifiedByName,
                    signature: preparedSigRef.current?.isEmpty() ? null : preparedSigRef.current?.toDataURL(),
                    date: formData.preparedVerifiedByDate ? new Date(formData.preparedVerifiedByDate).toISOString() : null,
                },
                acceptedBy: {
                    name: formData.acceptedByName,
                    signature: acceptedSigRef.current?.isEmpty() ? null : acceptedSigRef.current?.toDataURL(),
                    date: formData.acceptedByDate ? new Date(formData.acceptedByDate).toISOString() : null,
                },
                authorizedBy: {
                    name: formData.authorizedByName,
                    signature: authorizedSigRef.current?.isEmpty() ? null : authorizedSigRef.current?.toDataURL(),
                    date: formData.authorizedByDate ? new Date(formData.authorizedByDate).toISOString() : null,
                },
            };

            const workOrderData = {
                workOrderNumber: formData.workOrderNumber,
                date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
                projectName: formData.projectName,
                siteLocation: formData.siteLocation,
                issuedBy: formData.issuedBy,
                issuedTo: formData.issuedTo,
                contractType: formData.contractType,
                block: formData.block,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
                validTill: formData.validTill ? new Date(formData.validTill).toISOString() : null,
                taskReference: formData.taskReference,
                workItems: validItems,
                referenceDrawings: referenceDrawings.filter((r) => r.revisionDate || r.specification),
                resources,
                signatures,
            };

            if (initialData && initialData._id) {
                await workOrderService.updateWorkOrder(initialData._id, workOrderData);
                toast.success("Work Order updated successfully!");
            } else {
                await workOrderService.createWorkOrder(workOrderData);
                toast.success("Work Order created successfully!");
            }

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Error saving work order:", error);
            toast.error(error.response?.data?.message || "Failed to save work order");
        } finally {
            setIsSubmitting(false);
        }
    };

    const fieldClass = "w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50";
    const labelClass = "text-sm font-medium text-muted-foreground block mb-1.5";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Header */}
            <div className="border-b border-white/10 pb-6 mb-2">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <img src="/arihantlogo.png" alt="Arihant Logo" className="h-10 w-10 object-contain" />
                    <h2 className="text-xl md:text-2xl font-bold text-center">Arihant Dream Infra Projects Ltd. Jaipur</h2>
                </div>
                <p className="text-center text-xs text-muted-foreground">2nd Floor, Class Of Pearl, Income Tax Colony, Tonk Road, Durgapura, Jaipur, Rajasthan, 302018</p>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Pan No. : AAJCA5226A</span>
                    <span>CIN No. U7010RJ2011PLC035322</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Website: www.arihantgroupjaipur.com</span>
                    <span>Email: info@arihantgroupjaipur.com</span>
                </div>
                <h3 className="text-lg font-bold text-center mt-4">WORK ORDER</h3>
            </div>

            {/* Header Info Grid */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Work Order No.</label>
                    <input
                        type="text"
                        value={formData.workOrderNumber}
                        onChange={(e) => handleInputChange("workOrderNumber", e.target.value)}
                        onBlur={(e) => checkWoNumberUnique(e.target.value)}
                        className={`${fieldClass} ${woNumberError ? "border-red-500/60 focus:ring-red-500/50" : ""}`}
                        placeholder="e.g. WO-2026-001"
                    />
                    {woNumberError && <p className="text-red-400 text-xs mt-1">{woNumberError}</p>}
                </div>
                <div>
                    <label className={labelClass}>Date Issued</label>
                    <input type="date" value={formData.date} onChange={(e) => handleInputChange("date", e.target.value)} className={fieldClass} />
                </div>

                <div>
                    <label className={labelClass}>Project Name</label>
                    <input type="text" value={formData.projectName} onChange={(e) => handleInputChange("projectName", e.target.value)} className={fieldClass} placeholder="Project name" />
                </div>
                <div>
                    <label className={labelClass}>Site Location</label>
                    <input type="text" value={formData.siteLocation} onChange={(e) => handleInputChange("siteLocation", e.target.value)} className={fieldClass} placeholder="Site location" />
                </div>

                <div>
                    <label className={labelClass}>Issued By</label>
                    <input type="text" value={formData.issuedBy} onChange={(e) => handleInputChange("issuedBy", e.target.value)} className={fieldClass} placeholder="Name of person issuing" />
                </div>
                <div>
                    <label className={labelClass}>Issued To</label>
                    <input type="text" value={formData.issuedTo} onChange={(e) => handleInputChange("issuedTo", e.target.value)} className={fieldClass} placeholder="Contractor / vendor name" />
                </div>

                <div>
                    <label className={labelClass}>Contract</label>
                    <input type="text" value={formData.contractType} onChange={(e) => handleInputChange("contractType", e.target.value)} className={fieldClass} placeholder="Contract type / number" />
                </div>
                <div>
                    <label className={labelClass}>Block</label>
                    <input type="text" value={formData.block} onChange={(e) => handleInputChange("block", e.target.value)} className={fieldClass} placeholder="e.g. B Block" />
                </div>

                <div>
                    <label className={labelClass}>Start Date</label>
                    <input type="date" value={formData.startDate} onChange={(e) => handleInputChange("startDate", e.target.value)} className={fieldClass} />
                </div>
                <div>
                    <label className={labelClass}>Valid Till</label>
                    <input type="date" value={formData.validTill} onChange={(e) => handleInputChange("validTill", e.target.value)} className={fieldClass} />
                </div>
            </div>

            {/* Task Reference (internal linkage, not printed on the PDF) */}
            <div>
                <label className={labelClass}>
                    Task Reference <span className="text-xs text-blue-400 font-normal">(internal link, not printed)</span>
                </label>
                <div className="relative" ref={taskDropdownRef}>
                    <button
                        type="button"
                        onClick={() => { setTaskDropdownOpen((o) => !o); setTaskSearch(""); }}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#1a1b26] border border-blue-500/20 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-colors hover:bg-[#1f202e] cursor-pointer"
                    >
                        <span className={formData.taskReference ? "text-foreground" : "text-muted-foreground"}>
                            {formData.taskReference
                                ? (() => { const t = tasks.find((t) => t.taskId === formData.taskReference); return t ? `${t.taskId} — ${t.workParticulars}` : formData.taskReference; })()
                                : "Select a Task"}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {formData.taskReference && (
                                <span
                                    role="button" tabIndex={0}
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

                    {taskDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg bg-[#1a1a2e] border border-blue-500/20 shadow-2xl shadow-black/50 overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <input
                                    autoFocus type="text" value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)}
                                    placeholder="Search task ID or description..."
                                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                                />
                                {taskSearch && (
                                    <button type="button" onClick={() => setTaskSearch("")} className="text-muted-foreground hover:text-foreground">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <div className="max-h-52 overflow-y-auto">
                                <button type="button" onClick={() => { handleInputChange("taskReference", ""); setTaskDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-white/5 transition-colors">
                                    — No Task Linked —
                                </button>
                                {tasks.filter((t) => {
                                    const q = taskSearch.toLowerCase();
                                    return !q || t.taskId?.toLowerCase().includes(q) || t.workParticulars?.toLowerCase().includes(q);
                                }).map((t) => (
                                    <button
                                        key={t._id} type="button"
                                        onClick={() => { handleInputChange("taskReference", t.taskId); setTaskDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-blue-500/10 ${formData.taskReference === t.taskId ? 'bg-blue-500/15 text-blue-300' : 'text-foreground'}`}
                                    >
                                        <span className="font-medium text-blue-400">{t.taskId}</span>
                                        <span className="text-muted-foreground ml-2">— {t.workParticulars}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 1. Scope of Work */}
            <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold uppercase tracking-wide">1. Scope of Work</h3>
                    <motion.button type="button" onClick={addWorkItem} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Plus className="w-4 h-4" /> Add Row
                    </motion.button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left p-2 text-muted-foreground font-medium">Description of Work</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Floor</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Start Date</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Original End Date</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Revised Date</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {workItems.map((item, index) => (
                                <tr key={index} className="border-b border-white/5">
                                    <td className="p-2">
                                        <input type="text" value={item.workDescription} onChange={(e) => handleWorkItemChange(index, "workDescription", e.target.value)} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50" placeholder="Description" />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={item.floor} onChange={(e) => handleWorkItemChange(index, "floor", e.target.value)} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50" placeholder="Floor" />
                                    </td>
                                    <td className="p-2">
                                        <input type="date" value={item.workStartDate} onChange={(e) => handleWorkItemChange(index, "workStartDate", e.target.value)} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                                    </td>
                                    <td className="p-2">
                                        <input type="date" value={item.workFinishDate} onChange={(e) => handleWorkItemChange(index, "workFinishDate", e.target.value)} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                                    </td>
                                    <td className="p-2">
                                        <input type="date" value={item.revisedDate} onChange={(e) => handleWorkItemChange(index, "revisedDate", e.target.value)} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                                    </td>
                                    <td className="p-2">
                                        <button type="button" onClick={() => removeWorkItem(index)} disabled={workItems.length === 1} className="p-1 text-red-400 hover:bg-red-500/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. Reference Drawings / Specifications */}
            <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold uppercase tracking-wide">2. Reference Drawings / Specifications</h3>
                    <motion.button type="button" onClick={addRefDrawing} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Plus className="w-4 h-4" /> Add Row
                    </motion.button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left p-2 text-muted-foreground font-medium">Revision / Date</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Specification / Standard</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Attached (Y/N)</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {referenceDrawings.map((row, index) => (
                                <tr key={index} className="border-b border-white/5">
                                    <td className="p-2">
                                        <input type="date" value={row.revisionDate} onChange={(e) => handleRefDrawingChange(index, "revisionDate", e.target.value)} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={row.specification} onChange={(e) => handleRefDrawingChange(index, "specification", e.target.value)} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50" placeholder="Specification / Standard" />
                                    </td>
                                    <td className="p-2">
                                        <select value={row.attached} onChange={(e) => handleRefDrawingChange(index, "attached", e.target.value)} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50">
                                            <option value="" className="bg-[#1e1e2d]">—</option>
                                            <option value="Y" className="bg-[#1e1e2d]">Y</option>
                                            <option value="N" className="bg-[#1e1e2d]">N</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <button type="button" onClick={() => removeRefDrawing(index)} disabled={referenceDrawings.length === 1} className="p-1 text-red-400 hover:bg-red-500/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. Resources to be Deployed */}
            <div className="border-t border-white/10 pt-6">
                <h3 className="text-base font-semibold uppercase tracking-wide mb-4">3. Resources to be Deployed</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Labour (Mason)</label>
                        <input type="text" value={resources.labourMason} onChange={(e) => handleResourceChange("labourMason", e.target.value)} className={fieldClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Labour (beldar/cull)</label>
                        <input type="text" value={resources.labourBeldarCull} onChange={(e) => handleResourceChange("labourBeldarCull", e.target.value)} className={fieldClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Supervisor / Foreman</label>
                        <input type="text" value={resources.supervisorForeman} onChange={(e) => handleResourceChange("supervisorForeman", e.target.value)} className={fieldClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Engineer InCharge</label>
                        <input type="text" value={resources.engineerInCharge} onChange={(e) => handleResourceChange("engineerInCharge", e.target.value)} className={fieldClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Equipment / Machinery</label>
                        <input type="text" value={resources.equipmentMachinery} onChange={(e) => handleResourceChange("equipmentMachinery", e.target.value)} className={fieldClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Material Issued</label>
                        <input type="text" value={resources.materialIssued} onChange={(e) => handleResourceChange("materialIssued", e.target.value)} className={fieldClass} />
                    </div>
                </div>
            </div>

            {/* Signature Section */}
            <div className="border-t border-white/10 pt-6 mt-6">
                <h3 className="text-base font-semibold uppercase tracking-wide mb-4">Prepared, Accepted & Authorized By</h3>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <input type="text" value={formData.preparedVerifiedByName} onChange={(e) => handleInputChange("preparedVerifiedByName", e.target.value)} className={fieldClass} placeholder="Name" />
                        <input type="date" value={formData.preparedVerifiedByDate} onChange={(e) => handleInputChange("preparedVerifiedByDate", e.target.value)} className={fieldClass} />
                        <SignaturePad ref={preparedSigRef} label="Prepared & Verified By" />
                    </div>
                    <div className="space-y-2">
                        <input type="text" value={formData.acceptedByName} onChange={(e) => handleInputChange("acceptedByName", e.target.value)} className={fieldClass} placeholder="Name" />
                        <input type="date" value={formData.acceptedByDate} onChange={(e) => handleInputChange("acceptedByDate", e.target.value)} className={fieldClass} />
                        <SignaturePad ref={acceptedSigRef} label="Accepted By" />
                    </div>
                    <div className="space-y-2">
                        <input type="text" value={formData.authorizedByName} onChange={(e) => handleInputChange("authorizedByName", e.target.value)} className={fieldClass} placeholder="Name" />
                        <input type="date" value={formData.authorizedByDate} onChange={(e) => handleInputChange("authorizedByDate", e.target.value)} className={fieldClass} />
                        <SignaturePad ref={authorizedSigRef} label="Authorized By" />
                    </div>
                </div>
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
