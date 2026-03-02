import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Send, FileText, RotateCcw } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";
import { createIndent, updateIndent } from "@/services/indentService";
import { getTasks } from "@/services/taskService";
import { getSiteLookups } from "@/services/siteLookupService";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const IndentForm = ({ onSuccess, initialData = null }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [siteNames, setSiteNames] = useState([]);
    const [siteEngineers, setSiteEngineers] = useState([]);
    const [materialGroups, setMaterialGroups] = useState([]);

    useEffect(() => {
        getTasks().then(setTasks).catch(() => { });
        getSiteLookups('siteName').then(d => setSiteNames(d.map(x => x.value))).catch(() => { });
        getSiteLookups('siteEngineer').then(d => setSiteEngineers(d.map(x => x.value))).catch(() => { });
        getSiteLookups('materialGroup').then(d => setMaterialGroups(d.map(x => x.value))).catch(() => { });
    }, []);

    const storeManagerSigRef = useRef(null);
    const siteEngineerSigRef = useRef(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        indentNumber: "",
        taskReference: "",
        siteEngineerName: "",
        materialGroup: "",
        siteName: "",
        workDescription: "",
        blockFloorWork: "",
        leadTime: "",
        priority: "Medium",
        storeManagerName: "",
        storeManagerSignature: "",
        siteEngineerSignature: "",
    });

    const [items, setItems] = useState(
        initialData?.items || [{ materialDescription: "", unit: "", requiredQuantity: "", orderQuantity: "" }]
    );

    useEffect(() => {
        if (initialData) {
            setFormData({
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                indentNumber: initialData.indentNumber || "",
                taskReference: initialData.taskReference || "",
                siteEngineerName: initialData.siteEngineerName || "",
                materialGroup: initialData.materialGroup || "",
                siteName: initialData.siteName || "",
                workDescription: initialData.workDescription || "",
                blockFloorWork: initialData.blockFloorWork || "",
                leadTime: initialData.leadTime || "",
                priority: initialData.priority || "Medium",
                storeManagerName: initialData.storeManagerName || "",
                storeManagerSignature: initialData.storeManagerSignature || "",
                siteEngineerSignature: initialData.siteEngineerSignature || "",
            });
            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items);
            }
            // Draw stored signatures back onto canvas pads after mount
            setTimeout(() => {
                if (initialData.storeManagerSignature && storeManagerSigRef.current) {
                    storeManagerSigRef.current.fromDataURL(initialData.storeManagerSignature);
                }
                if (initialData.siteEngineerSignature && siteEngineerSigRef.current) {
                    siteEngineerSigRef.current.fromDataURL(initialData.siteEngineerSignature);
                }
            }, 100);
        }
    }, [initialData]);
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { materialDescription: "", unit: "", requiredQuantity: "", orderQuantity: "" }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const captureSignatures = () => {
        const storeSig = storeManagerSigRef.current;
        const siteSig = siteEngineerSigRef.current;
        return {
            storeManagerSignature: storeSig && !storeSig.isEmpty() ? storeSig.getCanvas().toDataURL('image/png') : formData.storeManagerSignature,
            siteEngineerSignature: siteSig && !siteSig.isEmpty() ? siteSig.getCanvas().toDataURL('image/png') : formData.siteEngineerSignature,
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.indentNumber) {
            toast.error("Indent Number is required");
            return;
        }
        if (!formData.siteEngineerName) {
            toast.error("Site Engineer Name is required");
            return;
        }
        if (!formData.siteName) {
            toast.error("Site Name is required");
            return;
        }

        // Validate items
        const hasValidItem = items.some(item => item.materialDescription && item.requiredQuantity);
        if (!hasValidItem) {
            toast.error("Please add at least one item with description and required quantity");
            return;
        }

        const signatures = captureSignatures();

        setIsSubmitting(true);
        const loadingToast = toast.loading((initialData && initialData._id) ? "Updating Indent..." : "Submitting Indent...");

        try {
            if (initialData && initialData._id) {
                await updateIndent(initialData._id, { ...formData, ...signatures, items });
                toast.success("Indent updated successfully", { id: loadingToast });
            } else {
                await createIndent({ ...formData, ...signatures, items });
                toast.success("Site Requirement submitted successfully", { id: loadingToast });
            }

            onSuccess && onSuccess();

            if (!initialData) {
                // Reset form only if creating new
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    indentNumber: "",
                    taskReference: "",
                    siteEngineerName: "",
                    materialGroup: "",
                    siteName: "",
                    workDescription: "",
                    blockFloorWork: "",
                    leadTime: "",
                    priority: "Medium",
                    storeManagerName: "",
                    storeManagerSignature: "",
                    siteEngineerSignature: "",
                });
                storeManagerSigRef.current?.clear();
                siteEngineerSigRef.current?.clear();
                setItems([{ materialDescription: "", unit: "", requiredQuantity: "", orderQuantity: "" }]);
            }

        } catch (error) {
            console.error(error);
            const msg = error?.response?.data?.message || ((initialData && initialData._id) ? "Failed to update indent" : "Failed to submit request");
            toast.error(msg, { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="text-foreground max-w-5xl mx-auto space-y-6">

            {/* Header Section */}
            <div className="border-b border-white/10 pb-6">
                <div className="flex items-center justify-between mb-4">
                    <img src="/arihantlogo.png" alt="Arihant Logo" className="h-12 w-12 object-contain" />
                    <h2 className="text-xl md:text-2xl font-bold text-center flex-1">
                        Arihant Dream Infra Projects Ltd. Jaipur
                    </h2>
                </div>
                <div className="text-center space-y-1 text-xs md:text-sm text-muted-foreground">
                    <p>2nd Floor, Class Of Pearl, Income Tax Colony, Tank Road, Durgapura, Jaipur, Rajasthan, 302018</p>
                </div>
                <h3 className="text-xl font-bold text-center mt-4 mb-2">
                    {(initialData && initialData._id) ? "EDIT MATERIAL INDENT / SITE REQUIREMENT" : "MATERIAL INDENT / SITE REQUIREMENT FORM"}
                </h3>
            </div>


            {/* Indent Details Section - All Details First */}
            <div className="grid md:grid-cols-3 gap-6 p-6 bg-white/5 rounded-xl border border-white/10">

                {/* Row 1 */}
                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Indent Number</label>
                    <input
                        type="text"
                        value={formData.indentNumber}
                        onChange={(e) => handleInputChange("indentNumber", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="IND-001"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Task Reference <span className="text-xs text-blue-400 font-normal">— link to a task</span>
                    </label>
                    <select
                        value={formData.taskReference}
                        onChange={(e) => handleInputChange("taskReference", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-black/20 border border-blue-500/20 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                    >
                        <option value="">— No Task Linked —</option>
                        {tasks.map(t => (
                            <option key={t._id} value={t.taskId}>
                                {t.taskId} — {t.workParticulars}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Date</label>
                    <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange("date", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Priority</label>
                    <Select onValueChange={(value) => handleInputChange("priority", value)} value={formData.priority}>
                        <SelectTrigger className="w-full px-4 py-3 h-auto rounded-lg bg-black/20 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                            <SelectValue placeholder="Select Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                    </Select>
                </div>


                {/* Row 2 */}
                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Site Name</label>
                    <div className="relative flex w-full items-stretch rounded-lg bg-black/20 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/50">
                        <input
                            type="text"
                            value={formData.siteName}
                            onChange={(e) => handleInputChange("siteName", e.target.value)}
                            placeholder="Type or select site..."
                            className="flex-1 bg-transparent px-4 py-3 text-foreground focus:outline-none text-sm"
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center justify-center px-3 border-l border-white/10 hover:bg-white/5 transition-colors group">
                                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] border-white/10 bg-[#1e1e2d]">
                                {siteNames.map(s => (
                                    <DropdownMenuItem key={s} onClick={() => handleInputChange("siteName", s)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                        {s}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Site Engineer Name</label>
                    <div className="relative flex w-full items-stretch rounded-lg bg-black/20 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/50">
                        <input
                            type="text"
                            value={formData.siteEngineerName}
                            onChange={(e) => handleInputChange("siteEngineerName", e.target.value)}
                            placeholder="Type or select engineer..."
                            className="flex-1 bg-transparent px-4 py-3 text-foreground focus:outline-none text-sm"
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center justify-center px-3 border-l border-white/10 hover:bg-white/5 transition-colors group">
                                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] border-white/10 bg-[#1e1e2d]">
                                {siteEngineers.map(e => (
                                    <DropdownMenuItem key={e} onClick={() => handleInputChange("siteEngineerName", e)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                        {e}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Material Group</label>
                    <div className="relative flex w-full items-stretch rounded-lg bg-black/20 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/50">
                        <input
                            type="text"
                            value={formData.materialGroup}
                            onChange={(e) => handleInputChange("materialGroup", e.target.value)}
                            placeholder="Type or select group..."
                            className="flex-1 bg-transparent px-4 py-3 text-foreground focus:outline-none text-sm"
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center justify-center px-3 border-l border-white/10 hover:bg-white/5 transition-colors group">
                                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] border-white/10 bg-[#1e1e2d]">
                                {materialGroups.map(g => (
                                    <DropdownMenuItem key={g} onClick={() => handleInputChange("materialGroup", g)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                        {g}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>


                {/* Row 3 */}
                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Work Block / Floor</label>
                    <input
                        type="text"
                        value={formData.blockFloorWork}
                        onChange={(e) => handleInputChange("blockFloorWork", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="e.g. Block A, 1st Floor"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Lead Time (Days)</label>
                    <input
                        type="number"
                        value={formData.leadTime}
                        onChange={(e) => handleInputChange("leadTime", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="Days"
                    />
                </div>

                <div className="md:col-span-1">
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Work Description</label>
                    <input
                        type="text"
                        value={formData.workDescription}
                        onChange={(e) => handleInputChange("workDescription", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="Brief description of work"
                    />
                </div>

            </div>


            {/* Material Requirement Table */}
            <div className="border border-white/10 rounded-xl overflow-hidden mt-8 bg-black/20">

                <div className="p-4 font-bold text-lg text-foreground bg-white/5 border-b border-white/10 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Material Requirements List
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 border-b border-white/10 bg-white/5 font-medium text-xs uppercase text-muted-foreground">
                    <div className="col-span-5 p-3 text-left border-r border-white/10">Materials Description</div>
                    <div className="col-span-2 p-3 text-center border-r border-white/10">Unit</div>
                    <div className="col-span-2 p-3 text-center border-r border-white/10">Required Qty</div>
                    <div className="col-span-3 p-3 text-center">Order Qty</div>
                </div>

                {/* Table Items */}
                <div className="divide-y divide-white/10">
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 group relative min-h-[45px] hover:bg-white/5 transition-colors">
                            <div className="col-span-5 border-r border-white/10 relative">
                                <textarea
                                    className="w-full h-full bg-transparent text-foreground outline-none resize-none overflow-hidden p-3 placeholder:text-muted-foreground/50 text-sm focus:bg-white/5 transition-colors"
                                    value={item.materialDescription}
                                    onChange={(e) => handleItemChange(index, "materialDescription", e.target.value)}
                                    placeholder="Item description"
                                    rows={1}
                                />
                            </div>
                            <div className="col-span-2 border-r border-white/10">
                                <select
                                    className="w-full h-full bg-transparent text-foreground outline-none text-center p-3 placeholder:text-muted-foreground/50 text-sm focus:bg-white/5 transition-colors appearance-none cursor-pointer"
                                    value={item.unit}
                                    onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                                >
                                    <option value="" className="bg-zinc-900 text-muted-foreground">Select Unit</option>

                                    <optgroup label="Count" className="bg-zinc-900 text-foreground font-semibold">
                                        <option value="Nos" className="font-normal">Nos (Numbers)</option>
                                        <option value="Pcs" className="font-normal">Pcs (Pieces)</option>
                                        <option value="Set" className="font-normal">Set</option>
                                        <option value="Pkt" className="font-normal">Pkt (Packet)</option>
                                        <option value="Box" className="font-normal">Box</option>
                                        <option value="Bag" className="font-normal">Bag</option>
                                        <option value="Roll" className="font-normal">Roll</option>
                                    </optgroup>

                                    <optgroup label="Weight" className="bg-zinc-900 text-foreground font-semibold">
                                        <option value="Kg" className="font-normal">Kg (Kilogram)</option>
                                        <option value="g" className="font-normal">g (Gram)</option>
                                        <option value="MT" className="font-normal">MT (Metric Ton)</option>
                                        <option value="Ton" className="font-normal">Ton</option>
                                        <option value="Quintal" className="font-normal">Quintal (100 Kg)</option>
                                        <option value="Lbs" className="font-normal">Lbs (Pounds)</option>
                                    </optgroup>

                                    <optgroup label="Length" className="bg-zinc-900 text-foreground font-semibold">
                                        <option value="M" className="font-normal">M (Meter)</option>
                                        <option value="Cm" className="font-normal">Cm (Centimeter)</option>
                                        <option value="Mm" className="font-normal">Mm (Millimeter)</option>
                                        <option value="Ft" className="font-normal">Ft (Feet)</option>
                                        <option value="Inch" className="font-normal">Inch</option>
                                        <option value="Yd" className="font-normal">Yd (Yard)</option>
                                    </optgroup>

                                    <optgroup label="Area" className="bg-zinc-900 text-foreground font-semibold">
                                        <option value="SqM" className="font-normal">SqM (Square Meter)</option>
                                        <option value="SqFt" className="font-normal">SqFt (Square Feet)</option>
                                        <option value="SqInch" className="font-normal">SqInch (Square Inch)</option>
                                        <option value="Acre" className="font-normal">Acre</option>
                                        <option value="Hectare" className="font-normal">Hectare</option>
                                    </optgroup>

                                    <optgroup label="Volume" className="bg-zinc-900 text-foreground font-semibold">
                                        <option value="Ltr" className="font-normal">Ltr (Liter)</option>
                                        <option value="Ml" className="font-normal">Ml (Milliliter)</option>
                                        <option value="CuM" className="font-normal">CuM (Cubic Meter)</option>
                                        <option value="CFT" className="font-normal">CFT (Cubic Feet)</option>
                                        <option value="Gallon" className="font-normal">Gallon</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div className="col-span-2 border-r border-white/10">
                                <input
                                    type="text"
                                    className="w-full h-full bg-transparent text-foreground outline-none text-center p-3 placeholder:text-muted-foreground/50 text-sm focus:bg-white/5 transition-colors"
                                    value={item.requiredQuantity}
                                    onChange={(e) => handleItemChange(index, "requiredQuantity", e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="col-span-3 p-1 relative flex items-center justify-center">
                                <input
                                    type="text"
                                    className="w-full h-full bg-transparent text-foreground outline-none text-center p-2 placeholder:text-muted-foreground/50 text-sm focus:bg-white/5 transition-colors"
                                    value={item.orderQuantity}
                                    onChange={(e) => handleItemChange(index, "orderQuantity", e.target.value)}
                                    placeholder="0"
                                />
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/20 rounded-md"
                                        title="Remove Item"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    <div className="p-3 border-b border-white/10 bg-black/20 text-center">
                        <button
                            type="button"
                            onClick={addItem}
                            className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center justify-center gap-2 mx-auto px-4 py-2 hover:bg-blue-500/10 rounded-lg transition-colors"

                        >
                            <Plus className="w-4 h-4" /> Add Row
                        </button>
                    </div>
                </div>

                {/* Footer Notes */}
                <div className="p-4 border-b border-white/10 bg-black/20 text-muted-foreground text-xs font-medium space-y-1">
                    <p>1. Verification must be completed.</p>
                    <p>2. Minimum lead time should be 5–6 days.</p>
                    <p>3. Consumption period should be 15–20 days.</p>
                    <p>4. Work should not be interrupted. Delivery must be on time.</p>
                    <p>5. In case of non-verification, the spreadsheets should be edited accordingly.</p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2">
                    <div className="border-r border-white/10 p-3 bg-white/5 font-bold text-center text-foreground uppercase text-xs tracking-wider">Store Manager</div>
                    <div className="p-3 bg-white/5 font-bold text-center text-foreground uppercase text-xs tracking-wider">Site Engineer</div>
                </div>
                <div className="grid grid-cols-2 bg-black/20">
                    {/* Store Manager Signature */}
                    <div className="border-r border-white/10 p-3 flex flex-col gap-2">
                        <input
                            type="text"
                            value={formData.storeManagerName}
                            onChange={(e) => handleInputChange("storeManagerName", e.target.value)}
                            className="w-full bg-transparent text-foreground outline-none text-center text-sm placeholder:text-muted-foreground/30 focus:bg-white/5 transition-colors border-b border-white/10 pb-1"
                            placeholder="Name"
                        />
                        <div className="relative border border-white/20 rounded-lg overflow-hidden bg-white">
                            <SignatureCanvas
                                ref={storeManagerSigRef}
                                penColor="#1a1a2e"
                                canvasProps={{
                                    className: 'w-full',
                                    style: { width: '100%', height: '110px', display: 'block' }
                                }}
                            />
                            <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-gray-400 pointer-events-none select-none">Draw signature above</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => storeManagerSigRef.current?.clear()}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors self-end px-2 py-1 hover:bg-red-500/10 rounded-md"
                        >
                            <RotateCcw className="w-3 h-3" /> Clear
                        </button>
                    </div>
                    {/* Site Engineer Signature */}
                    <div className="p-3 flex flex-col gap-2">
                        <input
                            type="text"
                            value={formData.siteEngineerName}
                            onChange={(e) => handleInputChange("siteEngineerName", e.target.value)}
                            className="w-full bg-transparent text-foreground outline-none text-center text-sm placeholder:text-muted-foreground/30 focus:bg-white/5 transition-colors border-b border-white/10 pb-1"
                            placeholder="Name"
                        />
                        <div className="relative border border-white/20 rounded-lg overflow-hidden bg-white">
                            <SignatureCanvas
                                ref={siteEngineerSigRef}
                                penColor="#1a1a2e"
                                canvasProps={{
                                    className: 'w-full',
                                    style: { width: '100%', height: '110px', display: 'block' }
                                }}
                            />
                            <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-gray-400 pointer-events-none select-none">Draw signature above</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => siteEngineerSigRef.current?.clear()}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors self-end px-2 py-1 hover:bg-red-500/10 rounded-md"
                        >
                            <RotateCcw className="w-3 h-3" /> Clear
                        </button>
                    </div>
                </div>

            </div>

            <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl font-bold text-lg bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-8"
                whileTap={{ scale: 0.98 }}
            >
                {isSubmitting ? ((initialData && initialData._id) ? "Updating..." : "Submitting...") : (
                    <>
                        <Send className="w-5 h-5" /> {(initialData && initialData._id) ? "Update Indent" : "Submit Indent Requirement"}
                    </>
                )}
            </motion.button>
        </form>
    );
};

export default IndentForm;
