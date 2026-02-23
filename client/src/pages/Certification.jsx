import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Upload, X, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import SignaturePad from "@/components/SignaturePad";
import workCompletionService from "@/services/workCompletionService";
import { workOrderService } from "@/services/workOrderService";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { uploadService } from "@/services/uploadService";

const Certification = () => {
    const navigate = useNavigate();
    const contractorSigRef = useRef(null);
    const [workOrders, setWorkOrders] = useState([]);

    useEffect(() => {
        const fetchWorkOrders = async () => {
            try {
                const data = await workOrderService.getAllWorkOrders();
                setWorkOrders(data);
            } catch (error) {
                console.error("Failed to fetch work orders", error);
                toast.error("Failed to load work orders");
            }
        };
        fetchWorkOrders();
    }, []);

    const [formData, setFormData] = useState({
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
    });

    const [workExecutionRows, setWorkExecutionRows] = useState([
        {
            summary: "",
            startDate: "",
            endDate: "",
            timeDelay: "",
            actual: "",
            completionPercent: "",
        },
    ]);

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

    const [isSubmitting, setIsSubmitting] = useState(false);

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
                blockTower: selectedWO.workLocationName || "",
                floorZoneUnit: "", // Not explicitly in WO, leave empty or infer if possible
                workTrade: workItem.workDescription || "",
                specificActivity: workItem.workDescription || "",
                contractorName: selectedWO.contactPersonName || "", // Mapping Contact Person to Contractor Name as per plan
                engineerName: selectedWO.storeKeeperSupervisorName || "",
                workStartDate: workItem.workStartDate ? new Date(workItem.workStartDate).toISOString().split('T')[0] : "",
                workEndDate: workItem.workFinishDate ? new Date(workItem.workFinishDate).toISOString().split('T')[0] : "",
                totalWorkDuration: duration,
            }));
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
        if (!formData.floorZoneUnit) {
            toast.error("Floor/Zone/Unit is required");
            return;
        }
        if (!formData.workTrade) {
            toast.error("Work Trade is required");
            return;
        }
        if (!formData.contractorName) {
            toast.error("Contractor Name is required");
            return;
        }
        if (!formData.engineerName) {
            toast.error("Engineer Name is required");
            return;
        }
        if (!formData.workStartDate) {
            toast.error("Work Start Date is required");
            return;
        }
        if (!formData.workEndDate) {
            toast.error("Work End Date is required");
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

        // Note: Checklist items are optional - not all items need to be checked

        // Validate contractor signature
        if (contractorSigRef.current?.isEmpty()) {
            toast.error("Contractor signature is required");
            return;
        }

        // Validate agreement checkbox
        if (!formData.iAgree) {
            toast.error("Contractor must agree to the confirmation statement");
            return;
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

            // Submit to backend API
            await workCompletionService.createWorkCompletion(certificationData);

            toast.success("Work Completion & Certification submitted successfully!");
            navigate("/admin");
        } catch (error) {
            console.error("Error submitting certification:", error);
            toast.error(error.response?.data?.message || "Failed to submit certification");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            <BackgroundOrbs />

            <div className="relative z-10 min-h-screen p-4 md:p-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-6"
                >
                    <motion.button
                        onClick={() => navigate("/")}
                        className="glass-card p-3 hover:bg-white/10 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </motion.button>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        Work Completion & <span className="text-gradient-primary">Certification</span>
                    </h1>
                </motion.div>

                {/* Form Container */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="max-w-6xl mx-auto"
                >
                    <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-6">
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
                                        <Select
                                            value={formData.workOrderNumber}
                                            onValueChange={handleWorkOrderSelect}
                                        >
                                            <SelectTrigger className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                                                <SelectValue placeholder="Select Work Order" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.isArray(workOrders) && workOrders.map((wo) => (
                                                    <SelectItem key={wo._id} value={wo.workOrderNumber || "unknown"}>
                                                        {wo.workOrderNumber} - {wo.workLocationName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                                            <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 transition-colors">
                                                                <Upload className="w-3 h-3 text-muted-foreground" />
                                                                <span className="text-xs text-muted-foreground">Upload Proof</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => handleImageUpload("preWorkChecklist", key, e.target.files[0])}
                                                                />
                                                            </label>
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
                                                            <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 transition-colors">
                                                                <Upload className="w-3 h-3 text-muted-foreground" />
                                                                <span className="text-xs text-muted-foreground">Upload Proof</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => handleImageUpload("duringWorkChecklist", key, e.target.files[0])}
                                                                />
                                                            </label>
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
                                                            <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 transition-colors">
                                                                <Upload className="w-3 h-3 text-muted-foreground" />
                                                                <span className="text-xs text-muted-foreground">Upload Proof</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => handleImageUpload("postWorkChecklist", key, e.target.files[0])}
                                                                />
                                                            </label>
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
                                            className="w-4 h-4 rounded border-white/10 bg-white/5 text-orange-500 focus:ring-orange-500/50"
                                        />
                                        <span className="text-sm font-medium">I Agree</span>
                                    </label>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <SignaturePad ref={contractorSigRef} label="Signature Of Contractor" />

                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.confirmationDate}
                                            onChange={(e) => handleInputChange("confirmationDate", e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4 mt-6">
                            <motion.button
                                type="submit"
                                disabled={isSubmitting || uploading}
                                className="flex-1 py-3 rounded-xl font-semibold bg-orange-500 text-white hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                whileHover={!isSubmitting && !uploading ? { scale: 1.02 } : {}}
                                whileTap={!isSubmitting && !uploading ? { scale: 0.98 } : {}}
                            >
                                {isSubmitting || uploading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Certification"
                                )}
                            </motion.button>
                            <motion.button
                                type="button"
                                onClick={() => navigate("/")}
                                className="px-8 py-3 rounded-xl font-semibold glass-card hover:bg-white/10 transition-all"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Cancel
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div >
    );
};

export default Certification;
