import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Upload, X, Image as ImageIcon, Send, Search } from "lucide-react";
import { toast } from "sonner";
import SignaturePad from "@/components/SignaturePad";
import workCompletionService from "@/services/workCompletionService";
import { workOrderService } from "@/services/workOrderService";
import { uploadService } from "@/services/uploadService";
import FileUploadSelector from "./FileUploadSelector";
import { useLocation } from "react-router-dom";


const WorkCompletionForm = ({ onSuccess, initialData, sourceWorkOrder: sourceWorkOrderProp }) => {
    const contractorSigRef = useRef(null);
    const woDropdownRef = useRef(null);
    const [workOrders, setWorkOrders] = useState([]);
    const [woSearch, setWoSearch] = useState("");
    const [woDropdownOpen, setWoDropdownOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        workOrderService.getWorkOrdersAll()
            .then(setWorkOrders)
            .catch((error) => {
                console.error("Failed to fetch work orders", error);
                toast.error("Failed to load work orders");
            });
    }, []);

    // Close WO dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (woDropdownRef.current && !woDropdownRef.current.contains(e.target)) {
                setWoDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Pre-fill form when editing
    useEffect(() => {
        if (initialData) {
            setFormData({
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                workOrderNumber: initialData.workOrderNumber || "",
                blockTower: initialData.blockTower || "",
                floorZoneUnit: initialData.floorZoneUnit || "",
                workTrade: initialData.workTrade || "",
                specificActivity: initialData.specificActivity || "",
                contractorName: initialData.contractorName || "",
                billNo: initialData.billNo || "",
                engineerName: initialData.engineerName || "",
                workStartDate: initialData.workStartDate ? new Date(initialData.workStartDate).toISOString().split('T')[0] : "",
                workEndDate: initialData.workEndDate ? new Date(initialData.workEndDate).toISOString().split('T')[0] : "",
                totalWorkDuration: initialData.totalWorkDuration || "",
                qcRemarks: initialData.qcRemarks || "",
                iAgree: initialData.iAgree || false,
                confirmationDate: initialData.confirmationDate ? new Date(initialData.confirmationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            });
            if (initialData.workExecutionRows?.length > 0) {
                setWorkExecutionRows(initialData.workExecutionRows);
            }
            if (initialData.preWorkChecklist) setPreWorkChecklist(initialData.preWorkChecklist);
            if (initialData.duringWorkChecklist) setDuringWorkChecklist(initialData.duringWorkChecklist);
            if (initialData.postWorkChecklist) setPostWorkChecklist(initialData.postWorkChecklist);
            if (initialData.checklistImages) setChecklistImages(initialData.checklistImages);
            if (initialData.contractorSignature && contractorSigRef.current?.fromDataURL) {
                setTimeout(() => contractorSigRef.current.fromDataURL(initialData.contractorSignature), 200);
            }
        }
    }, [initialData]);

    const [formData, setFormData] = useState(() => {
        // Prefer prop over location.state
        const wo = sourceWorkOrderProp || location.state?.sourceWorkOrder;
        if (wo && !initialData) {
            const firstItem = wo.workItems?.[0];
            let duration = "";
            if (firstItem && firstItem.workStartDate && firstItem.workFinishDate) {
                const start = new Date(firstItem.workStartDate);
                const end = new Date(firstItem.workFinishDate);
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                duration = `${diffDays} days`;
            }
            return {
                date: new Date().toISOString().split('T')[0],
                workOrderNumber: wo.workOrderNumber || "",
                blockTower: wo.addressLocation || wo.workLocationName || "",
                floorZoneUnit: "",
                workTrade: "",
                specificActivity: firstItem?.workDescription || "",
                contractorName: wo.contactPersonName || "",
                billNo: "",
                engineerName: wo.storeKeeperSupervisorName || "",
                workStartDate: firstItem?.workStartDate ? new Date(firstItem.workStartDate).toISOString().split('T')[0] : "",
                workEndDate: firstItem?.workFinishDate ? new Date(firstItem.workFinishDate).toISOString().split('T')[0] : "",
                totalWorkDuration: duration,
                qcRemarks: "",
                iAgree: false,
                confirmationDate: new Date().toISOString().split('T')[0],
            };
        }
        return {
            date: new Date().toISOString().split('T')[0],
            workOrderNumber: "",
            blockTower: "",
            floorZoneUnit: "",
            workTrade: "",
            specificActivity: "",
            contractorName: "",
            billNo: "",
            engineerName: "",
            workStartDate: "",
            workEndDate: "",
            totalWorkDuration: "",
            qcRemarks: "",
            iAgree: false,
            confirmationDate: new Date().toISOString().split('T')[0],
        };
    });

    const [workExecutionRows, setWorkExecutionRows] = useState(() => {
        // Prefer prop over location.state
        const wo = sourceWorkOrderProp || location.state?.sourceWorkOrder;
        if (wo && !initialData) {
            if (wo.workItems && wo.workItems.length > 0) {
                return wo.workItems.map(item => ({
                    summary: item.workDescription || "",
                    startDate: item.workStartDate ? new Date(item.workStartDate).toISOString().split('T')[0] : "",
                    endDate: item.workFinishDate ? new Date(item.workFinishDate).toISOString().split('T')[0] : "",
                    timeDelay: "",
                    actual: "",
                    completionPercent: "",
                }));
            }
        }
        return [
            {
                summary: "",
                startDate: "",
                endDate: "",
                timeDelay: "",
                actual: "",
                completionPercent: "",
            },
        ];
    });

    // Initial layout logic handles prefill correctly. We do not need a useEffect.

    const [preWorkChecklist, setPreWorkChecklist] = useState({
        materialsChecked: false,
        linesLevelsMarkings: false,
        servicesCoordinated: false,
        surfacePrepared: false,
    });

    const [duringWorkChecklist, setDuringWorkChecklist] = useState({
        workmanshipQuality: false,
        approvedMaterialRatio: false,
        alignmentLevel: false,
        safetyHousekeeping: false,
    });

    const [postWorkChecklist, setPostWorkChecklist] = useState({
        finishingQuality: false,
        noCracksLeakage: false,
        curingDone: false,
        debrisCleared: false,
        finalPhotos: false,
    });

    const [checklistImages, setChecklistImages] = useState({});
    const [uploading, setUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleImageUpload = async (section, key, file) => {
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const response = await uploadService.uploadImage(file);

            setChecklistImages(prev => ({
                ...prev,
                [`${section}_${key}`]: response.key
            }));
            toast.success("Proof uploaded successfully");
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const removeChecklistImage = (section, key) => {
        setChecklistImages(prev => {
            const newState = { ...prev };
            delete newState[`${section}_${key}`];
            return newState;
        });
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleWorkExecutionChange = (index, field, value) => {
        const updatedRows = [...workExecutionRows];
        updatedRows[index][field] = value;
        setWorkExecutionRows(updatedRows);
    };

    const handleWorkOrderSelect = (workOrderNumber) => {
        const selectedWO = workOrders.find(wo => wo.workOrderNumber === workOrderNumber);

        if (selectedWO) {
            const workItem = selectedWO.workItems?.[0] || {};

            // Calculate duration
            let duration = "";
            if (workItem.workStartDate && workItem.workFinishDate) {
                const start = new Date(workItem.workStartDate);
                const end = new Date(workItem.workFinishDate);
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                duration = `${diffDays} days`;
            }

            setFormData(prev => ({
                ...prev,
                workOrderNumber: selectedWO.workOrderNumber,
                blockTower: selectedWO.addressLocation || selectedWO.workLocationName || "", // Maps accurately
                floorZoneUnit: "", // Not explicitly in WO, leave empty or infer if possible
                workTrade: workItem.workDescription || "",
                specificActivity: workItem.workDescription || "",
                contractorName: selectedWO.contactPersonName || "", // Mapping Contact Person to Contractor Name as per plan
                engineerName: selectedWO.storeKeeperSupervisorName || "",
                workStartDate: workItem.workStartDate ? new Date(workItem.workStartDate).toISOString().split('T')[0] : "",
                workEndDate: workItem.workFinishDate ? new Date(workItem.workFinishDate).toISOString().split('T')[0] : "",
                totalWorkDuration: duration,
            }));

            // Sync work items to execution rows
            if (selectedWO.workItems && selectedWO.workItems.length > 0) {
                const rows = selectedWO.workItems.map(item => ({
                    summary: item.workDescription || "",
                    startDate: item.workStartDate ? new Date(item.workStartDate).toISOString().split('T')[0] : "",
                    endDate: item.workFinishDate ? new Date(item.workFinishDate).toISOString().split('T')[0] : "",
                    timeDelay: "",
                    actual: "",
                    completionPercent: "",
                }));
                setWorkExecutionRows(rows);
            }

        } else {
            setFormData(prev => ({ ...prev, workOrderNumber: workOrderNumber }));
        }
    };

    const addWorkExecutionRow = () => {
        setWorkExecutionRows([
            ...workExecutionRows,
            {
                summary: "",
                startDate: "",
                endDate: "",
                timeDelay: "",
                actual: "",
                completionPercent: "",
            },
        ]);
    };

    const removeWorkExecutionRow = (index) => {
        if (workExecutionRows.length > 1) {
            setWorkExecutionRows(workExecutionRows.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.workOrderNumber) {
            toast.error("Work Order Number is required");
            return;
        }
        if (!formData.blockTower) {
            toast.error("Block/Tower is required");
            return;
        }
        if (!formData.contractorName) {
            toast.error("Contractor Name is required");
            return;
        }

        // Validate at least one work execution row is filled
        const hasValidRow = workExecutionRows.some(
            (row) => row.summary && row.startDate && row.endDate
        );
        if (!hasValidRow) {
            toast.error("At least one work execution summary is required");
            return;
        }

        // Validate agreement checkbox
        if (!formData.iAgree) {
            toast.error("Contractor must agree to the confirmation statement");
            return;
        }

        // Validate unchecked checklist items require an image
        const checklistSections = [
            { state: preWorkChecklist, name: 'preWorkChecklist' },
            { state: duringWorkChecklist, name: 'duringWorkChecklist' },
            { state: postWorkChecklist, name: 'postWorkChecklist' },
        ];
        for (const { state, name } of checklistSections) {
            for (const [key, checked] of Object.entries(state)) {
                if (!checked && !checklistImages[`${name}_${key}`]) {
                    toast.error(`Please upload proof for unchecked checklist item: "${key.replace(/([A-Z])/g, ' $1').trim()}"`);
                    return;
                }
            }
        }

        setIsSubmitting(true);

        try {
            // Get signature data
            const contractorSignature = contractorSigRef.current?.toDataURL();

            const certificationData = {
                ...formData,
                workExecutionRows,
                preWorkChecklist,
                duringWorkChecklist,
                postWorkChecklist,
                checklistImages,
                contractorSignature,
            };

            // Submit or Update based on initialData
            if (initialData?._id) {
                await workCompletionService.updateWorkCompletion(initialData._id, certificationData);
                toast.success("Work Completion updated successfully!");
            } else {
                await workCompletionService.createWorkCompletion(certificationData);
                toast.success("Work Completion & Certification submitted successfully!");
            }
            onSuccess && onSuccess();

            // Reset form could be done here, but navigation usually handles state reset

        } catch (error) {
            console.error("Error submitting certification:", error);
            toast.error(error.response?.data?.message || "Failed to submit certification");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 text-foreground">
            {/* Company Header */}
            <div className="border-b border-white/10 pb-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <img src="/arihantlogo.png" alt="Arihant Logo" className="h-12 w-12 object-contain" />
                    <h2 className="text-xl md:text-2xl font-bold text-center flex-1">
                        Arihant Dream Infra Projects Ltd. Jaipur
                    </h2>
                </div>
                <div className="text-center space-y-1 text-xs md:text-sm text-muted-foreground">
                    <p>2nd Floor, Class Of Pearl, Income Tax Colony, Tank Road, Durgapura, Jaipur, Rajasthan, 302018 (Pan - AAJCA5226A)</p>
                    <p>CIN No. U7010RJ2011PLC035322</p>
                </div>
                <h3 className="text-xl font-bold text-center mt-4 mb-6">WORK COMPLETION & QC CERTIFICATION FORM</h3>

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
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-muted-foreground block mb-1">Work Order No.</label>
                            {/* Searchable Work Order Combobox */}
                            <div className="relative" ref={woDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => { setWoDropdownOpen(o => !o); setWoSearch(""); }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm transition-colors hover:bg-white/10 cursor-pointer"
                                >
                                    <span className={formData.workOrderNumber ? "text-foreground" : "text-muted-foreground"}>
                                        {formData.workOrderNumber || "Select Work Order"}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {formData.workOrderNumber && (
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => { e.stopPropagation(); handleInputChange("workOrderNumber", ""); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleInputChange("workOrderNumber", ""); } }}
                                                className="text-muted-foreground hover:text-red-400 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                        <svg className={`w-4 h-4 text-muted-foreground transition-transform ${woDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </button>

                                {woDropdownOpen && (
                                    <div className="absolute z-50 mt-1 w-full rounded-lg bg-[#1a1a2e] border border-orange-500/20 shadow-2xl shadow-black/50 overflow-hidden">
                                        {/* Search */}
                                        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                                            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                            <input
                                                autoFocus
                                                type="text"
                                                value={woSearch}
                                                onChange={(e) => setWoSearch(e.target.value)}
                                                placeholder="Search work order number or location..."
                                                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                                            />
                                            {woSearch && (
                                                <button type="button" onClick={() => setWoSearch("")} className="text-muted-foreground hover:text-foreground">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Options */}
                                        <div className="max-h-56 overflow-y-auto">
                                            <button
                                                type="button"
                                                onClick={() => { handleInputChange("workOrderNumber", ""); setWoDropdownOpen(false); }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-white/5 transition-colors"
                                            >
                                                — No Work Order —
                                            </button>

                                            {workOrders
                                                .filter(wo => {
                                                    const q = woSearch.toLowerCase();
                                                    return !q ||
                                                        wo.workOrderNumber?.toLowerCase().includes(q) ||
                                                        wo.workLocationName?.toLowerCase().includes(q) ||
                                                        wo.addressLocation?.toLowerCase().includes(q);
                                                })
                                                .map(wo => (
                                                    <button
                                                        key={wo._id}
                                                        type="button"
                                                        onClick={() => { handleWorkOrderSelect(wo.workOrderNumber); setWoDropdownOpen(false); }}
                                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-orange-500/10 ${formData.workOrderNumber === wo.workOrderNumber ? 'bg-orange-500/15 text-orange-300' : 'text-foreground'
                                                            }`}
                                                    >
                                                        <span className="font-medium text-orange-400">{wo.workOrderNumber}</span>
                                                        {wo.workLocationName && <span className="text-muted-foreground ml-2">— {wo.workLocationName}</span>}
                                                    </button>
                                                ))
                                            }

                                            {workOrders.filter(wo => {
                                                const q = woSearch.toLowerCase();
                                                return !q || wo.workOrderNumber?.toLowerCase().includes(q) || wo.workLocationName?.toLowerCase().includes(q) || wo.addressLocation?.toLowerCase().includes(q);
                                            }).length === 0 && (
                                                    <p className="px-4 py-3 text-sm text-muted-foreground text-center">No work orders found</p>
                                                )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Work Details Section */}
            <div className="space-y-4">
                {/* Row 1 */}
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                            Block / Tower
                        </label>
                        <input
                            type="text"
                            value={formData.blockTower}
                            onChange={(e) => handleInputChange("blockTower", e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            placeholder="Enter block/tower"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                            Floor / Zone / Unit
                        </label>
                        <input
                            type="text"
                            value={formData.floorZoneUnit}
                            onChange={(e) => handleInputChange("floorZoneUnit", e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            placeholder="Enter floor/zone/unit"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                            Work Trade
                        </label>
                        <input
                            type="text"
                            value={formData.workTrade}
                            onChange={(e) => handleInputChange("workTrade", e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            placeholder="Enter work trade"
                        />
                    </div>
                </div>

                {/* Row 2 */}
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                            Specific Activity
                        </label>
                        <input
                            type="text"
                            value={formData.specificActivity}
                            onChange={(e) => handleInputChange("specificActivity", e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            placeholder="Enter specific activity"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                            Contractor Name
                        </label>
                        <input
                            type="text"
                            value={formData.contractorName}
                            onChange={(e) => handleInputChange("contractorName", e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            placeholder="Enter contractor name"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                            Bill No.
                        </label>
                        <input
                            type="text"
                            value={formData.billNo}
                            onChange={(e) => handleInputChange("billNo", e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            placeholder="Enter bill number"
                        />
                    </div>
                </div>

                {/* Row 3 */}
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                            Engineer Name
                        </label>
                        <input
                            type="text"
                            value={formData.engineerName}
                            onChange={(e) => handleInputChange("engineerName", e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            placeholder="Enter engineer name"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                            Work Start Date
                        </label>
                        <input
                            type="date"
                            value={formData.workStartDate}
                            onChange={(e) => handleInputChange("workStartDate", e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                            Work End Date
                        </label>
                        <input
                            type="date"
                            value={formData.workEndDate}
                            onChange={(e) => handleInputChange("workEndDate", e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        />
                    </div>
                </div>

                {/* Row 4 - Work Duration */}
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                            Total Work Duration
                        </label>
                        <input
                            type="text"
                            value={formData.totalWorkDuration}
                            onChange={(e) => handleInputChange("totalWorkDuration", e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            placeholder="e.g., 30 days"
                        />
                    </div>
                </div>
            </div>

            {/* Work Execution Summary Table */}
            <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Work Execution Summary</h3>
                    <motion.button
                        type="button"
                        onClick={addWorkExecutionRow}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
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
                                <th className="text-left p-2 text-muted-foreground font-medium">Work Execution Summary</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Start Date</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Work End Date</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Time Delay</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Actual</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Completion %</th>
                                <th className="text-left p-2 text-muted-foreground font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workExecutionRows.map((row, index) => (
                                <tr key={index} className="border-b border-white/5">
                                    <td className="p-2">
                                        <textarea
                                            value={row.summary}
                                            onChange={(e) => handleWorkExecutionChange(index, "summary", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50 min-h-[60px]"
                                            placeholder="Description"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="date"
                                            value={row.startDate}
                                            onChange={(e) => handleWorkExecutionChange(index, "startDate", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="date"
                                            value={row.endDate}
                                            onChange={(e) => handleWorkExecutionChange(index, "endDate", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            value={row.timeDelay}
                                            onChange={(e) => handleWorkExecutionChange(index, "timeDelay", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                            placeholder="Delay"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            value={row.actual}
                                            onChange={(e) => handleWorkExecutionChange(index, "actual", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                            placeholder="Actual"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            value={row.completionPercent}
                                            onChange={(e) => handleWorkExecutionChange(index, "completionPercent", e.target.value)}
                                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                            placeholder="%"
                                            min="0"
                                            max="100"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <button
                                            type="button"
                                            onClick={() => removeWorkExecutionRow(index)}
                                            disabled={workExecutionRows.length === 1}
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

            {/* Checklists Section */}
            <div className="border-t border-white/10 pt-6">
                <div className="grid md:grid-cols-3 gap-6">

                    {/* Pre-Work Checklist */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-center mb-4">Pre-Work Checklist</h3>
                        {Object.entries({
                            materialsChecked: "Materials Checked & Approved",
                            linesLevelsMarkings: "Lines, Levels & Markings Done",
                            servicesCoordinated: "Services Coordinated",
                            surfacePrepared: "Surface Prepared"
                        }).map(([key, label]) => (
                            <div key={key} className="space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preWorkChecklist[key]}
                                        onChange={(e) => setPreWorkChecklist({ ...preWorkChecklist, [key]: e.target.checked })}
                                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-orange-500 focus:ring-orange-500/50"
                                    />
                                    <span className="text-sm">{label}</span>
                                </label>

                                {!preWorkChecklist[key] && (
                                    <div className="ml-7">
                                        {checklistImages[`preWorkChecklist_${key}`] ? (
                                            <div className="relative inline-block">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-md border border-white/10">
                                                    <ImageIcon className="w-4 h-4 text-orange-400" />
                                                    <span className="text-xs text-muted-foreground">Proof Uploaded</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeChecklistImage("preWorkChecklist", key)}
                                                        className="ml-2 hover:text-red-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <FileUploadSelector
                                                    accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx"
                                                    onFileSelect={(file) => handleImageUpload("preWorkChecklist", key, file)}
                                                    title="Upload Proof"
                                                >
                                                    <button type="button" className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 transition-colors">
                                                        <Upload className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">Upload Image / File</span>
                                                    </button>
                                                </FileUploadSelector>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* During Work Checklist */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-center mb-4">During Work Checklist</h3>
                        {Object.entries({
                            workmanshipQuality: "Workmanship Quality Maintained",
                            approvedMaterialRatio: "Approved Material Ratio Used",
                            alignmentLevel: "Alignment & Level Verified",
                            safetyHousekeeping: "Safety & Housekeeping Followed"
                        }).map(([key, label]) => (
                            <div key={key} className="space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={duringWorkChecklist[key]}
                                        onChange={(e) => setDuringWorkChecklist({ ...duringWorkChecklist, [key]: e.target.checked })}
                                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-orange-500 focus:ring-orange-500/50"
                                    />
                                    <span className="text-sm">{label}</span>
                                </label>

                                {!duringWorkChecklist[key] && (
                                    <div className="ml-7">
                                        {checklistImages[`duringWorkChecklist_${key}`] ? (
                                            <div className="relative inline-block">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-md border border-white/10">
                                                    <ImageIcon className="w-4 h-4 text-orange-400" />
                                                    <span className="text-xs text-muted-foreground">Proof Uploaded</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeChecklistImage("duringWorkChecklist", key)}
                                                        className="ml-2 hover:text-red-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <FileUploadSelector
                                                    accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx"
                                                    onFileSelect={(file) => handleImageUpload("duringWorkChecklist", key, file)}
                                                    title="Upload Proof"
                                                >
                                                    <button type="button" className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 transition-colors">
                                                        <Upload className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">Upload Image / File</span>
                                                    </button>
                                                </FileUploadSelector>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Post-Work Checklist */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-center mb-4">Post-Work Checklist</h3>
                        {Object.entries({
                            finishingQuality: "Finishing Quality Checked",
                            noCracksLeakage: "No Cracks / Leakage / Unevenness",
                            curingDone: "Curing Done",
                            debrisCleared: "Debris Cleared",
                            finalPhotos: "Final photos attached"
                        }).map(([key, label]) => (
                            <div key={key} className="space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={postWorkChecklist[key]}
                                        onChange={(e) => setPostWorkChecklist({ ...postWorkChecklist, [key]: e.target.checked })}
                                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-orange-500 focus:ring-orange-500/50"
                                    />
                                    <span className="text-sm">{label}</span>
                                </label>

                                {!postWorkChecklist[key] && (
                                    <div className="ml-7">
                                        {checklistImages[`postWorkChecklist_${key}`] ? (
                                            <div className="relative inline-block">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-md border border-white/10">
                                                    <ImageIcon className="w-4 h-4 text-orange-400" />
                                                    <span className="text-xs text-muted-foreground">Proof Uploaded</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeChecklistImage("postWorkChecklist", key)}
                                                        className="ml-2 hover:text-red-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <FileUploadSelector
                                                    accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx"
                                                    onFileSelect={(file) => handleImageUpload("postWorkChecklist", key, file)}
                                                    title="Upload Proof"
                                                >
                                                    <button type="button" className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 transition-colors">
                                                        <Upload className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">Upload Image / File</span>
                                                    </button>
                                                </FileUploadSelector>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* QC Remarks Section */}
            <div className="border-t border-white/10 pt-6">
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                    QC Remarks By Engineer
                </label>
                <textarea
                    value={formData.qcRemarks}
                    onChange={(e) => handleInputChange("qcRemarks", e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 min-h-[100px]"
                    placeholder="Enter QC remarks and observations..."
                />
            </div>

            {/* Contractor Confirmation Section */}
            <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold mb-4">Contractor Confirmation</h3>

                <div className="space-y-4">
                    <div className="glass-card p-4 border border-white/10">
                        <p className="text-sm text-foreground mb-3">
                            I confirm the work is completed as per approved drawings & specifications.
                        </p>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.iAgree}
                                onChange={(e) => handleInputChange("iAgree", e.target.checked)}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-green-500 focus:ring-green-500/50"
                            />
                            <span className="text-sm">I have read and agree to the above statement</span>
                        </label>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <SignaturePad ref={contractorSigRef} label="Contractor Signature" />
                    </div>
                </div>
            </div>

            <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}
            >
                {isSubmitting ? (initialData?._id ? "Updating..." : "Submitting...") : (
                    <>
                        <Send className="w-4 h-4" /> {initialData?._id ? "Update Certification" : "Submit Certification"}
                    </>
                )}
            </motion.button>
        </form>
    );
};

export default WorkCompletionForm;
