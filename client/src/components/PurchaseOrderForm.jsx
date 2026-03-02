import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Save, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getIndents } from "@/services/indentService";
import { createPurchaseOrder, updatePurchaseOrder } from "@/services/purchaseOrderService";
import siteLookupService from "@/services/siteLookupService";
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
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { uploadService } from "@/services/uploadService";
import { FileUp, Link as LinkIcon } from "lucide-react";
import FileUploadSelector from "./FileUploadSelector";

const PurchaseOrderForm = ({ onSuccess, onCancel, initialData = null }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [indents, setIndents] = useState([]);
    const [selectedIndentObj, setSelectedIndentObj] = useState(null);

    // Fetch Vendors
    const { data: vendors = [] } = useQuery({
        queryKey: ['vendorsLookup'],
        queryFn: () => siteLookupService.getSiteLookups('vendor'),
    });

    const [formData, setFormData] = useState({
        poNumber: "",
        date: new Date().toISOString().split('T')[0],
        indentReferences: [],
        taskReference: "",

        // Vendor Info
        vendorName: "",
        vendorAddress: "",
        vendorGst: "",
        vendorContactNo: "",

        // Ship To Info
        shipToCompanyName: "ARIHANT DREAM INFRA PROJECTS LTD",
        shipToAddress: "",
        shipToContactPerson: "",
        shipToContactNo: "",

        // Summary Info
        freight: "",
        comments: "",
        termsAndConditions: "Billing must be in Name of \"RQUBE BUILDCON PRIVATE LIMITED\"\nMaterial Should Reach On Site Before 5:45 PM\nMaterial Delivery Date : Next day of payment.\nProperly Signed challan and MRN's Should be attached with bill at the time of submission.\nMaterial Found defective to be replaced at no additional cost to the purchaser.",

        // Authorizations
        preparedBy: "",
        verifiedBy: "",
        authorizedBy: "",

        status: "Pending",

        // Quotations
        quotation1Url: "",
        quotation2Url: "",
        quotation3Url: "",
        approvedQuotation: "none",
    });

    const [items, setItems] = useState([
        { materialDescription: "", unit: "", quantity: "", rate: "", baseAmount: 0, taxRate: "18", taxAmount: 0, amount: 0 }
    ]);

    const [quotationFiles, setQuotationFiles] = useState({
        quotation1: null,
        quotation2: null,
        quotation3: null,
    });

    useEffect(() => {
        // Fetch indents to populate dropdown
        getIndents().then(data => {
            // Only show verified/approved indents ideally, but for now we'll fetch all or filter if needed
            setIndents(data);
        }).catch(err => {
            console.error("Failed to fetch indents for PO form", err);
            toast.error("Failed to load Indents");
        });
    }, []);

    useEffect(() => {
        if (initialData) {
            // Convert initialData indentReferences strings or objects to an array of IDs
            const initialIndentRefs = Array.isArray(initialData.indentReferences)
                ? initialData.indentReferences.map(i => i?._id || i)
                : (initialData.indentReference ? [initialData.indentReference._id || initialData.indentReference] : []);

            setFormData({
                poNumber: initialData.poNumber || "",
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                indentReferences: initialIndentRefs,
                taskReference: initialData.taskReference || "",

                vendorName: initialData.vendorName || "",
                vendorAddress: initialData.vendorAddress || "",
                vendorGst: initialData.vendorGst || "",
                vendorContactNo: initialData.vendorContactNo || "",

                shipToCompanyName: initialData.shipToCompanyName || "ARIHANT DREAM INFRA PROJECTS LTD",
                shipToAddress: initialData.shipToAddress || "",
                shipToContactPerson: initialData.shipToContactPerson || "",
                shipToContactNo: initialData.shipToContactNo || "",

                freight: initialData.freight ?? "",
                comments: initialData.comments || "",
                termsAndConditions: initialData.termsAndConditions || "Billing must be in Name of \"RQUBE BUILDCON PRIVATE LIMITED\"\nMaterial Should Reach On Site Before 5:45 PM\nMaterial Delivery Date : Next day of payment.\nProperly Signed challan and MRN's Should be attached with bill at the time of submission.\nMaterial Found defective to be replaced at no additional cost to the purchaser.",

                preparedBy: initialData.preparedBy || "",
                verifiedBy: initialData.verifiedBy || "",
                authorizedBy: initialData.authorizedBy || "",

                status: initialData.status || "Pending",

                quotation1Url: initialData.quotation1Url || "",
                quotation2Url: initialData.quotation2Url || "",
                quotation3Url: initialData.quotation3Url || "",
                approvedQuotation: initialData.approvedQuotation || "none"
            });
            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items);
            }
        }
    }, [initialData]);

    // Handle Multiple Indent Selection
    const handleIndentToggle = (indentId) => {
        setFormData(prev => {
            const currentRefs = prev.indentReferences || [];
            const isSelected = currentRefs.includes(indentId);

            let newRefs;
            if (isSelected) {
                newRefs = currentRefs.filter(id => id !== indentId);
            } else {
                newRefs = [...currentRefs, indentId];
            }

            // Sync items and common data from the selected indents
            const selectedIndents = indents.filter(i => newRefs.includes(i._id));

            // For common fields, take from the first selected indent if available
            const firstIndent = selectedIndents[0];
            const taskRef = firstIndent ? (firstIndent.taskReference || "") : "";
            const shipToAddress = firstIndent ? (firstIndent.siteName || "") : "";
            const shipToContactPerson = firstIndent ? (firstIndent.siteEngineerName || "") : "";

            // Gather all items from all selected indents
            if (!initialData) {
                let gatheredItems = [];
                selectedIndents.forEach(indent => {
                    if (indent.items && indent.items.length > 0) {
                        const prefilledItems = indent.items.map(item => ({
                            _sourceIndentId: indent._id,
                            materialDescription: item.materialDescription || item.description || "",
                            unit: item.unit || "",
                            quantity: item.requiredQuantity || item.orderQuantity || item.quantity ? Number(item.requiredQuantity || item.orderQuantity || item.quantity) : 0,
                            rate: "",
                            baseAmount: 0,
                            taxRate: "18",
                            taxAmount: 0,
                            amount: 0
                        }));
                        gatheredItems = [...gatheredItems, ...prefilledItems];
                    }
                });
                console.log("gatheredItems:", gatheredItems);

                setItems(currentItems => {
                    console.log("currentItems before merge:", currentItems);
                    // Keep items that were manually added
                    const manualItems = currentItems.filter(i => !i._sourceIndentId && (i.materialDescription || i.quantity || i.rate));

                    // Keep items from indents that are STILL selected, preserving their edits
                    const mergedItems = gatheredItems.map(gatheredItem => {
                        const existingMatch = currentItems.find(ci => ci._sourceIndentId === gatheredItem._sourceIndentId && ci.materialDescription === gatheredItem.materialDescription);
                        return existingMatch ? existingMatch : gatheredItem;
                    });

                    const finalItems = [...mergedItems, ...manualItems];
                    console.log("finalItems after merge:", finalItems);
                    return finalItems.length > 0 ? finalItems : [{ materialDescription: "", unit: "", quantity: "", rate: "", baseAmount: 0, taxRate: "18", taxAmount: 0, amount: 0 }];
                });
            }

            return {
                ...prev,
                indentReferences: newRefs,
                taskReference: taskRef,
                shipToAddress: shipToAddress,
                shipToContactPerson: shipToContactPerson
            };
        });
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];

        // Prevent infinite loops where "10." becomes "10" by only 
        // updating values if they are truly different (especially for text inputs).
        newItems[index][field] = value;

        // Auto-calculate amounts when dependencies change
        if (['quantity', 'rate', 'taxRate', 'taxAmount'].includes(field)) {
            // Use raw value if changing quantity or rate, else parse from current state
            const rawQty = field === 'quantity' ? value : newItems[index].quantity;
            const rawRate = field === 'rate' ? value : newItems[index].rate;

            // Allow trailing decimals while typing, but parse correctly for math
            const qty = Number(rawQty) || 0;
            const rate = Number(rawRate) || 0;

            const baseAmount = qty * rate;
            newItems[index].baseAmount = baseAmount;

            let taxAmt = 0;
            if (field === 'taxAmount') {
                // If the user manually edited taxAmount, use that
                taxAmt = Number(value) || 0;
                newItems[index].taxAmount = taxAmt;
                // You COULD recalculate taxRate here, but usually, we just let taxAmount override.
            } else {
                // Otherwise calculate taxAmount from taxRate
                const rawTaxRate = field === 'taxRate' ? value : newItems[index].taxRate;
                const taxRatePercent = Number(rawTaxRate) || 0;
                taxAmt = baseAmount * (taxRatePercent / 100);
                // Keep decimal precision without weird floating point bugs
                newItems[index].taxAmount = Math.round(taxAmt * 100) / 100;
            }

            // Finally, set the total amount based on the fresh calculations
            newItems[index].amount = Math.round((baseAmount + taxAmt) * 100) / 100;
        }

        setItems(newItems);
    };

    const handleFileChange = (file, quotationKey) => {
        if (file) {
            setQuotationFiles(prev => ({
                ...prev,
                [quotationKey]: file
            }));
        }
    };

    const addItem = () => {
        setItems([...items, { materialDescription: "", unit: "", quantity: "", rate: "", baseAmount: 0, taxRate: "18", taxAmount: 0, amount: 0, _sourceIndentId: null }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const calculateSubTotal = () => {
        return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    };

    const calculateTotalAmount = () => {
        return calculateSubTotal() + (Number(formData.freight) || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.poNumber || formData.indentReferences.length === 0 || !formData.vendorName) {
            toast.error("Please fill in PO Number, Select at least one Indent, and Vendor Name.");
            return;
        }

        const validItems = items.filter(i => i.materialDescription && i.quantity && i.rate);
        if (validItems.length === 0) {
            toast.error("Please add at least one complete item (Description, Qty, Rate).");
            return;
        }

        setIsSubmitting(true);

        try {
            // Upload quotations if new files were selected
            let urls = {
                quotation1Url: formData.quotation1Url,
                quotation2Url: formData.quotation2Url,
                quotation3Url: formData.quotation3Url
            };

            for (const [key, file] of Object.entries(quotationFiles)) {
                if (file) {
                    // If we are replacing an existing quotation, delete the old file from S3
                    if (formData[`${key}Url`]) {
                        toast.info(`Removing old ${key}...`);
                        try {
                            await uploadService.deleteImage(formData[`${key}Url`]);
                        } catch (err) {
                            console.error(`Failed to delete old ${key}:`, err);
                            // Proceed anyway, we don't want a soft-delete failure to break the PO update
                        }
                    }

                    toast.info(`Uploading new ${key}...`);
                    const uploadResult = await uploadService.uploadImage(file);
                    // Match quotation1 => quotation1Url
                    urls[`${key}Url`] = uploadResult.key;
                }
            }

            const submissionData = {
                ...formData,
                ...urls,
                items: validItems,
                subTotal: calculateSubTotal(),
                totalAmount: calculateTotalAmount()
            };

            if (initialData && initialData._id) {
                await updatePurchaseOrder(initialData._id, submissionData);
                toast.success("Purchase Order updated successfully");
            } else {
                await createPurchaseOrder(submissionData);
                toast.success("Purchase Order created successfully");
            }
            onSuccess && onSuccess();
        } catch (error) {
            toast.error(error.message || "Failed to save Purchase Order");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Header Details */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">PO Number</label>
                    <input
                        type="text"
                        required
                        value={formData.poNumber}
                        onChange={(e) => handleInputChange("poNumber", e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        placeholder="e.g. PO-2023-001"
                        disabled={!!initialData?._id} // Usually PO number shouldn't change after creation
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Date</label>
                    <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => handleInputChange("date", e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Reference Indent(s)</label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-left flex items-center justify-between text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-white/10"
                            >
                                <span className={formData.indentReferences.length === 0 ? "text-muted-foreground" : "truncate"}>
                                    {formData.indentReferences.length > 0
                                        ? `${formData.indentReferences.length} Indent(s) Selected`
                                        : "Select Indents"}
                                </span>
                                <ChevronDown className="w-4 h-4 opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[300px] max-h-[300px] overflow-y-auto">
                            {indents.length > 0 ? (
                                indents.map((indent) => (
                                    <DropdownMenuCheckboxItem
                                        key={indent._id}
                                        checked={formData.indentReferences.includes(indent._id)}
                                        onCheckedChange={() => handleIndentToggle(indent._id)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex flex-col">
                                            <span>{indent.indentNumber}</span>
                                            <span className="text-xs text-muted-foreground">{indent.siteName}</span>
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                ))
                            ) : (
                                <DropdownMenuItem disabled>No verified idents found</DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Task Reference (Auto-filled)</label>
                    <input
                        type="text"
                        value={formData.taskReference}
                        readOnly
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-muted-foreground cursor-not-allowed opacity-70"
                        placeholder="Select an indent first"
                    />
                </div>

                <div className="space-y-4 lg:col-span-3 mt-4 border-t border-white/10 pt-6">
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Vendor Details</h4>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2 relative">
                            <label className="text-sm font-medium text-muted-foreground">Vendor Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={formData.vendorName}
                                    onChange={(e) => handleInputChange("vendorName", e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all pr-10"
                                    placeholder="Supplier / vendor name"
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="absolute right-0 top-0 bottom-0 px-3 hover:bg-white/5 rounded-r-xl border-l border-white/10 flex items-center justify-center text-muted-foreground transition-colors"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[240px] max-h-[300px] overflow-y-auto">
                                        {vendors.length > 0 ? vendors.map((vendor) => (
                                            <DropdownMenuItem
                                                key={vendor._id}
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        vendorName: vendor.value,
                                                        vendorAddress: vendor.vendorAddress || prev.vendorAddress,
                                                        vendorGst: vendor.vendorGst || prev.vendorGst,
                                                        vendorContactNo: vendor.vendorContactNo || prev.vendorContactNo
                                                    }));
                                                }}
                                                className="cursor-pointer"
                                            >
                                                {vendor.value}
                                            </DropdownMenuItem>
                                        )) : (
                                            <DropdownMenuItem disabled>
                                                No vendors found
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-muted-foreground">Vendor Address</label>
                            <input
                                type="text"
                                value={formData.vendorAddress}
                                onChange={(e) => handleInputChange("vendorAddress", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="Address"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Vendor GST No.</label>
                            <input
                                type="text"
                                value={formData.vendorGst}
                                onChange={(e) => handleInputChange("vendorGst", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="GST Number"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Vendor Contact No.</label>
                            <input
                                type="text"
                                value={formData.vendorContactNo}
                                onChange={(e) => handleInputChange("vendorContactNo", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="Phone number"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 lg:col-span-3 mt-2 border-t border-white/10 pt-6">
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Ship To Details</h4>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                            <input
                                type="text"
                                value={formData.shipToCompanyName}
                                onChange={(e) => handleInputChange("shipToCompanyName", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="Company Name"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-muted-foreground">Shipping Address</label>
                            <input
                                type="text"
                                value={formData.shipToAddress}
                                onChange={(e) => handleInputChange("shipToAddress", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="Site or Delivery Address"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Contact Person (Site)</label>
                            <input
                                type="text"
                                value={formData.shipToContactPerson}
                                onChange={(e) => handleInputChange("shipToContactPerson", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="Name of receiver"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Contact Person No.</label>
                            <input
                                type="text"
                                value={formData.shipToContactNo}
                                onChange={(e) => handleInputChange("shipToContactNo", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="Phone number"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-foreground">Order Items</h4>
                    <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Item
                    </button>
                </div>

                <div className="border border-white/10 rounded-xl overflow-x-auto bg-black/20">
                    <div className="min-w-[800px]">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 border-b border-white/10 bg-white/5 font-medium text-xs uppercase text-muted-foreground">
                            <div className="col-span-3 p-3 text-left border-r border-white/10">Material Description</div>
                            <div className="col-span-1 p-3 text-center border-r border-white/10">Unit</div>
                            <div className="col-span-1 p-3 text-center border-r border-white/10">QTY</div>
                            <div className="col-span-2 p-3 text-center border-r border-white/10">Rate (₹)</div>
                            <div className="col-span-1 p-3 text-center border-r border-white/10">Total w/o Tax</div>
                            <div className="col-span-1 p-3 text-center border-r border-white/10">Tax %</div>
                            <div className="col-span-1 p-3 text-center border-r border-white/10">Tax (₹)</div>
                            <div className="col-span-2 p-3 text-center">Amount (₹)</div>
                        </div>

                        {/* Table Items */}
                        <div className="divide-y divide-white/10">
                            <AnimatePresence>
                                {items.map((item, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="grid grid-cols-12 group relative min-h-[45px] hover:bg-white/5 transition-colors"
                                    >
                                        <div className="col-span-3 border-r border-white/10 relative">
                                            <textarea
                                                className="w-full h-full bg-transparent text-foreground outline-none resize-none overflow-hidden p-3 placeholder:text-muted-foreground/50 text-sm focus:bg-white/5 transition-colors"
                                                value={item.materialDescription}
                                                onChange={(e) => handleItemChange(index, "materialDescription", e.target.value)}
                                                placeholder="Item description"
                                                rows={1}
                                                required
                                            />
                                        </div>
                                        <div className="col-span-1 border-r border-white/10">
                                            <input
                                                type="text"
                                                className="w-full h-full bg-transparent text-foreground outline-none text-center p-3 placeholder:text-muted-foreground/50 text-sm focus:bg-white/5 transition-colors"
                                                value={item.unit}
                                                onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                                                placeholder="Unit"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-1 border-r border-white/10">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full h-full bg-transparent text-foreground outline-none text-center p-3 placeholder:text-muted-foreground/50 text-sm focus:bg-white/5 transition-colors"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                                placeholder="0"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-2 border-r border-white/10">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full h-full bg-transparent text-foreground outline-none text-center p-3 placeholder:text-muted-foreground/50 text-sm focus:bg-white/5 transition-colors"
                                                value={item.rate}
                                                onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-1 border-r border-white/10 flex items-center justify-center p-3">
                                            <span className="text-sm text-muted-foreground">
                                                ₹{Number(item.baseAmount || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="col-span-1 border-r border-white/10 relative min-h-[45px]">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full h-full absolute inset-0 bg-transparent text-foreground outline-none text-center pr-6 pl-2 placeholder:text-muted-foreground/50 text-sm focus:bg-white/5 transition-colors z-10"
                                                value={item.taxRate}
                                                onChange={(e) => handleItemChange(index, "taxRate", e.target.value)}
                                                placeholder="%"
                                            />
                                            <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pr-1">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger className="w-5 h-8 border-0 bg-transparent shadow-none focus:ring-0 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground">
                                                        <ChevronDown className="h-4 w-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-[#1e1e2d] border-white/10 min-w-[60px]">
                                                        {[0, 5, 12, 18, 28].map(tax => (
                                                            <DropdownMenuItem
                                                                key={tax}
                                                                onClick={() => handleItemChange(index, "taxRate", tax.toString())}
                                                                className="cursor-pointer justify-center"
                                                            >
                                                                {tax}%
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                        <div className="col-span-1 border-r border-white/10">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full h-full bg-transparent text-foreground outline-none text-center p-3 placeholder:text-muted-foreground/50 text-sm focus:bg-white/5 transition-colors"
                                                value={item.taxAmount}
                                                onChange={(e) => handleItemChange(index, "taxAmount", e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="col-span-2 relative flex items-center justify-center p-3">
                                            <span className="text-sm font-bold text-foreground">
                                                ₹{Number(item.amount).toFixed(2)}
                                            </span>
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
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between pt-6 border-t border-white/5 gap-8">
                    {/* Left: Comments and Terms */}
                    <div className="w-full md:w-2/3 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Comments or Special Instructions</label>
                            <textarea
                                value={formData.comments}
                                onChange={(e) => handleInputChange("comments", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[60px]"
                                placeholder="Any additional notes..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Terms & Conditions</label>
                            <textarea
                                value={formData.termsAndConditions}
                                onChange={(e) => handleInputChange("termsAndConditions", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[120px] text-sm"
                            />
                        </div>
                    </div>

                    {/* Right: Summary Math */}
                    <div className="w-full md:w-1/3 space-y-3">
                        <div className="flex justify-between items-center py-2 px-4 bg-white/5 rounded-lg">
                            <span className="text-sm text-muted-foreground">SUBTOTAL</span>
                            <span className="text-sm font-medium text-foreground">₹{calculateSubTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-4 bg-white/5 rounded-lg border border-primary/20">
                            <label className="text-sm text-muted-foreground">Freight</label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.freight}
                                    onChange={(e) => handleInputChange("freight", e.target.value)}
                                    className="w-24 bg-transparent border-b border-white/20 px-1 py-0.5 text-right text-sm focus:outline-none focus:border-primary text-foreground"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-center py-3 px-4 bg-primary/20 rounded-lg mt-2">
                            <span className="text-sm font-bold text-primary">TOTAL</span>
                            <span className="text-xl font-bold text-gradient-primary">
                                ₹{calculateTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Authorizations Section */}
            <div className="grid md:grid-cols-3 gap-4 pt-6 border-t border-white/10 mt-6">
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Prepared By</label>
                    <input
                        type="text"
                        value={formData.preparedBy}
                        onChange={(e) => handleInputChange("preparedBy", e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Verified By</label>
                    <input
                        type="text"
                        value={formData.verifiedBy}
                        onChange={(e) => handleInputChange("verifiedBy", e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Authorized By</label>
                    <input
                        type="text"
                        value={formData.authorizedBy}
                        onChange={(e) => handleInputChange("authorizedBy", e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                </div>
            </div>

            {/* Quotations Section */}
            <div className="pt-6 border-t border-white/10 mt-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Quotations & Approvals</h3>
                <div className="grid md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((num) => (
                        <div key={`quotation${num}`} className="space-y-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <FileUp className="w-4 h-4" />
                                    Quotation {num}
                                </label>
                            </div>

                            <FileUploadSelector
                                accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg"
                                onFileSelect={(file) => handleFileChange(file, `quotation${num}`)}
                                title={`Upload Quotation ${num}`}
                            >
                                <button type="button" className="block w-full text-left text-sm text-primary bg-primary/20 hover:bg-primary/30 py-2 px-4 rounded-full font-semibold transition-all">
                                    {quotationFiles[`quotation${num}`] ? quotationFiles[`quotation${num}`].name : "Select File or Take Photo"}
                                </button>
                            </FileUploadSelector>

                            {formData[`quotation${num}Url`] && (
                                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 px-3 py-1.5 rounded-md">
                                    <LinkIcon className="w-3 h-3" /> Existing file attached
                                </div>
                            )}

                            <label className="flex items-center gap-2 mt-4 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="radio"
                                        name="approvedQuotation"
                                        value={`quotation${num}`}
                                        checked={formData.approvedQuotation === `quotation${num}`}
                                        onChange={(e) => handleInputChange("approvedQuotation", e.target.value)}
                                        className="appearance-none w-4 h-4 border border-white/20 rounded-full checked:border-primary checked:border-4 cursor-pointer transition-all"
                                    />
                                </div>
                                <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                                    Mark as Approved
                                </span>
                            </label>
                        </div>
                    ))}
                </div>
                {formData.approvedQuotation !== 'none' && (
                    <div className="flex justify-end mt-2">
                        <button
                            type="button"
                            onClick={() => handleInputChange("approvedQuotation", "none")}
                            className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                        >
                            Clear Approval Setup
                        </button>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-white/10 justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 rounded-xl border border-white/10 text-foreground hover:bg-white/5 transition-colors font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:brightness-110 transition-all disabled:opacity-70"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    {initialData ? "Update Order" : "Generate PO"}
                </button>
            </div>
        </form>
    );
};

export default PurchaseOrderForm;
