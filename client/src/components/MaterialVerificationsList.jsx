import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ShoppingCart, Save, FileCheck, UploadCloud, FileText, CheckCircle2, Trash2, FileSpreadsheet, FileDown, Edit2, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { updateMaterialVerification, resetMaterialVerification, updateDeliveryReceipt, deleteDeliveryReceipt } from "@/services/purchaseOrderService";
import { uploadService } from "@/services/uploadService";
import FileUploadSelector from "./FileUploadSelector";
import { generateMaterialVerificationPdf } from "@/utils/materialVerificationPdfExport";
import { exportMaterialVerificationXlsx } from "@/utils/materialVerificationXlsxExport";
import { exportMaterialVerificationCsv } from "@/utils/materialVerificationCsvExport";

const MaterialVerificationsList = ({
    purchaseOrders,
    isAdmin,
    onVerificationSuccess,
    searchQuery,
    filterStatus,
    canEdit,
    highlightedPoId,
    onClearHighlight
}) => {
    // canEdit allows engineers to also edit; falls back to isAdmin for backwards compat
    const hasEditAccess = canEdit || isAdmin;
    const [expandedId, setExpandedId] = useState(null);
    const [showNewDelivery, setShowNewDelivery] = useState(false); // Toggle for the Add Delivery form
    const [localQuantities, setLocalQuantities] = useState({});
    const [localRemarks, setLocalRemarks] = useState({});
    const [localImages, setLocalImages] = useState({});
    const [maalPraptiFile, setMaalPraptiFile] = useState(null);
    const [maalPraptiPreviewUrl, setMaalPraptiPreviewUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Receipt Editing State
    const [editReceiptId, setEditReceiptId] = useState(null);
    const [editReceiptQuantities, setEditReceiptQuantities] = useState({});
    const [editReceiptRemarks, setEditReceiptRemarks] = useState({});
    const [editReceiptImages, setEditReceiptImages] = useState({});
    const [editMaalPraptiFile, setEditMaalPraptiFile] = useState(null);
    const [isUpdatingReceipt, setIsUpdatingReceipt] = useState(false);
    const [deleteReceiptConfirm, setDeleteReceiptConfirm] = useState(null); // { poId, receiptId }

    // Handle highlighted PO redirect from Admin Dashboard
    useEffect(() => {
        if (highlightedPoId) {
            setExpandedId(highlightedPoId);
            // Wait for render to complete before scrolling
            setTimeout(() => {
                const el = document.getElementById(`po-verif-${highlightedPoId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('bg-primary/20', 'border-primary/50', 'ring-2', 'ring-primary', 'shadow-[0_0_15px_rgba(var(--primary),0.3)]');
                    el.classList.remove('bg-white/5');

                    setTimeout(() => {
                        el.classList.remove('bg-primary/20', 'border-primary/50', 'ring-2', 'ring-primary', 'shadow-[0_0_15px_rgba(var(--primary),0.3)]');
                        el.classList.add('bg-white/5');
                        if (onClearHighlight) onClearHighlight();
                    }, 2500); // Highlight lasts 2.5 seconds
                } else if (onClearHighlight) {
                    onClearHighlight();
                }
            }, 300);
        }
    }, [highlightedPoId, onClearHighlight]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'dd/MM/yyyy');
        } catch (error) {
            return dateString;
        }
    };

    // Initialize local state when expanding a row
    const handleExpand = async (po) => {
        if (expandedId === po._id) {
            setExpandedId(null);
            setShowNewDelivery(false);
        } else {
            setExpandedId(po._id);
            setShowNewDelivery(false);
            const initialQtys = {};
            const initialRemarks = {};
            const initialImages = {};
            po.items?.forEach(item => {
                initialQtys[item._id] = ''; // Start empty for a new delivery
                initialRemarks[item._id] = '';
                initialImages[item._id] = null;
            });
            setLocalQuantities(initialQtys);
            setLocalRemarks(initialRemarks);
            setLocalImages(initialImages);
            setMaalPraptiFile(null);
            setMaalPraptiPreviewUrl(null); // Preview URL is bound to specific receipts now
            setEditReceiptId(null);
        }
    };

    const handleQuantityChange = (itemId, value) => {
        setLocalQuantities(prev => ({
            ...prev,
            [itemId]: value
        }));
    };

    const handleRemarkChange = (itemId, value) => {
        setLocalRemarks(prev => ({ ...prev, [itemId]: value }));
    };

    const handleImageChange = (itemId, file) => {
        setLocalImages(prev => ({ ...prev, [itemId]: file }));
    };

    const handleSaveVerification = async (po) => {
        if (!po || isSaving || isUploading) return;

        if (!hasEditAccess) {
            toast.error("You don't have permission to update material verifications.");
            return;
        }

        try {
            setIsSaving(true);
            // Pre-upload all item-specific images
            setIsUploading(true);
            const uploadedImageUrls = {};
            for (const item of po.items) {
                const file = localImages[item._id];
                if (file) {
                    toast.info(`Uploading image for ${item.materialDescription}...`);
                    try {
                        const uploadResult = await uploadService.uploadImage(file);
                        uploadedImageUrls[item._id] = uploadResult.key;
                    } catch (e) {
                        toast.error(`Failed to upload ${item.materialDescription} image`);
                        setIsUploading(false);
                        setIsSaving(false);
                        return;
                    }
                }
            }

            let payload = {
                items: po.items.map(item => ({
                    _id: item._id,
                    quantityReceived: Number(localQuantities[item._id]) || 0,
                    qualityCheckRemarks: localRemarks[item._id] || "",
                    itemImageUrl: uploadedImageUrls[item._id] || null
                }))
            };

            // Handle file upload if a new file is placed
            if (maalPraptiFile) {
                setIsUploading(true);
                toast.info("Uploading Maal Prapti Rasid...");

                // If replacing, try to delete the old one
                if (po.maalPraptiRasidUrl) {
                    try {
                        await uploadService.deleteImage(po.maalPraptiRasidUrl);
                    } catch (e) {
                        console.error("Non-fatal: could not delete old rasid", e);
                    }
                }

                const uploadResult = await uploadService.uploadImage(maalPraptiFile);
                payload.maalPraptiRasidUrl = uploadResult.key;
                setIsUploading(false);
            }

            await updateMaterialVerification(po._id, payload);
            toast.success("Delivery recorded successfully!");

            // Reset form
            setMaalPraptiFile(null);
            setShowNewDelivery(false);

            // Re-fetch parent to reflect changes
            if (onVerificationSuccess) onVerificationSuccess();
        } catch (error) {
            toast.error(error.message || "Failed to update verification.");
            setIsUploading(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (poId) => {
        if (!isAdmin) return;
        setIsDeleting(true);
        try {
            await resetMaterialVerification(poId);
            toast.success("Verification data cleared successfully.");
            setDeleteConfirmId(null);
            if (onVerificationSuccess) onVerificationSuccess();
        } catch (error) {
            toast.error(error.message || "Failed to clear verification data.");
        } finally {
            setIsDeleting(false);
        }
    };

    const startEditReceipt = (po, receipt) => {
        setEditReceiptId(receipt._id);
        const qtys = {};
        const remarks = {};
        const images = {};
        po.items.forEach(poItem => {
            const rItem = receipt.items.find(i => i.materialDescription === poItem.materialDescription);
            qtys[poItem._id] = rItem ? rItem.quantityReceived : '';
            remarks[poItem._id] = rItem ? (rItem.qualityCheckRemarks || '') : '';
            images[poItem._id] = null; // We reset file input, keep old url untouched unless overridden
        });
        setEditReceiptQuantities(qtys);
        setEditReceiptRemarks(remarks);
        setEditReceiptImages(images);
        setEditMaalPraptiFile(null);
    };

    const cancelEditReceipt = () => {
        setEditReceiptId(null);
        setEditReceiptQuantities({});
        setEditReceiptRemarks({});
        setEditReceiptImages({});
        setEditMaalPraptiFile(null);
    };

    const handleEditQuantityChange = (itemId, value) => {
        setEditReceiptQuantities(prev => ({ ...prev, [itemId]: value }));
    };

    const handleEditRemarkChange = (itemId, value) => {
        setEditReceiptRemarks(prev => ({ ...prev, [itemId]: value }));
    };

    const handleEditImageChange = (itemId, file) => {
        setEditReceiptImages(prev => ({ ...prev, [itemId]: file }));
    };

    const handleSaveReceiptEdit = async (po, receiptId) => {
        if (isUpdatingReceipt) return;
        try {
            setIsUpdatingReceipt(true);
            const receipt = po.receipts.find(r => r._id === receiptId);

            // Upload any newly selected item imagery
            const uploadedImageUrls = {};
            for (const item of po.items) {
                const file = editReceiptImages[item._id];
                if (file) {
                    toast.info(`Uploading new image for ${item.materialDescription}...`);
                    try {
                        const rItem = receipt?.items.find(i => i.materialDescription === item.materialDescription);
                        if (rItem && rItem.itemImageUrl) {
                            try { await uploadService.deleteImage(rItem.itemImageUrl); } catch (e) { }
                        }
                        const uploadResult = await uploadService.uploadImage(file);
                        uploadedImageUrls[item._id] = uploadResult.key;
                    } catch (e) {
                        toast.error(`Failed to upload ${item.materialDescription} image`);
                    }
                } else {
                    // Carry over old image URL if present and untouched
                    const rItem = receipt?.items.find(i => i.materialDescription === item.materialDescription);
                    uploadedImageUrls[item._id] = rItem ? rItem.itemImageUrl : null;
                }
            }

            const payload = {
                items: po.items.map(item => ({
                    materialDescription: item.materialDescription,
                    quantityReceived: Number(editReceiptQuantities[item._id]) || 0,
                    qualityCheckRemarks: editReceiptRemarks[item._id] || "",
                    itemImageUrl: uploadedImageUrls[item._id] || null
                }))
            };

            if (editMaalPraptiFile) {
                toast.info("Uploading new Maal Prapti Rasid...");
                if (receipt && receipt.maalPraptiRasidUrl) {
                    try { await uploadService.deleteImage(receipt.maalPraptiRasidUrl); } catch (e) { }
                }
                const uploadResult = await uploadService.uploadImage(editMaalPraptiFile);
                payload.maalPraptiRasidUrl = uploadResult.key;
            }

            await updateDeliveryReceipt(po._id, receiptId, payload);
            toast.success("Delivery receipt updated successfully!");
            cancelEditReceipt();
            if (onVerificationSuccess) onVerificationSuccess();
        } catch (error) {
            toast.error(error.message || "Failed to update receipt.");
        } finally {
            setIsUpdatingReceipt(false);
        }
    };

    const handleDeleteReceipt = async () => {
        if (!isAdmin || !deleteReceiptConfirm) return;

        try {
            setIsDeleting(true);
            await deleteDeliveryReceipt(deleteReceiptConfirm.poId, deleteReceiptConfirm.receiptId);
            toast.success("Receipt deleted successfully.");
            setDeleteReceiptConfirm(null);
            if (onVerificationSuccess) onVerificationSuccess();
        } catch (error) {
            toast.error(error.message || "Failed to delete receipt.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="space-y-4">
                {(() => {
                    const q = searchQuery.toLowerCase();
                    const filtered = purchaseOrders.filter(po => {
                        const matchSearch = !q ||
                            po.poNumber?.toLowerCase().includes(q) ||
                            po.vendorName?.toLowerCase().includes(q) ||
                            po.taskReference?.toLowerCase().includes(q) ||
                            (po.indentReferences && po.indentReferences.some(i => i?.indentNumber?.toLowerCase().includes(q)));

                        let poStatus = po.materialVerificationStatus || 'Pending';
                        const matchStatus = filterStatus === 'all' || poStatus === filterStatus;

                        return matchSearch && matchStatus;
                    });

                    if (filtered.length === 0) {
                        return <div className="text-center py-8 text-muted-foreground glass-card rounded-xl">No Purchase Orders match your criteria.</div>;
                    }

                    return filtered.map((po) => {
                        const isPendingOrPartial = po.materialVerificationStatus !== 'Verified';
                        const status = po.materialVerificationStatus || 'Pending'; // Keep status for display
                        return (
                            <motion.div
                                key={po._id}
                                id={`po-verif-${po._id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card overflow-hidden bg-white/5 transition-all duration-500 ease-in-out"
                            >
                                <div
                                    onClick={() => handleExpand(po)}
                                    className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/5 transition-colors cursor-pointer gap-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/20 rounded-xl text-primary shrink-0">
                                            <FileCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-foreground text-base">{po.poNumber}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${status === 'Verified' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    status === 'Partial' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                        'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                                    }`}>
                                                    {status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground flex gap-3 flex-wrap">
                                                <span>Vendor: <strong className="font-medium text-foreground/80">{po.vendorName}</strong></span>
                                                <span className="opacity-50">•</span>
                                                <span>Indent: {po.indentReferences?.map(i => i?.indentNumber).join(', ') || 'N/A'}</span>
                                                <span className="opacity-50">•</span>
                                                <span>Date: {formatDate(po.date)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:block text-right mr-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            {po.items?.length || 0} Items
                                        </div>
                                        <motion.div animate={{ rotate: expandedId === po._id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                        </motion.div>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {expandedId === po._id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="border-t border-white/10"
                                        >
                                            <div className="p-6 space-y-6 bg-black/20">

                                                {/* Tools / Actions Bar */}
                                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                                                    <div className="flex-1">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Delivery Receipts</p>
                                                        <p className="text-sm text-muted-foreground">{po.receipts ? po.receipts.length : 0} deliveries recorded.</p>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {/* PDF */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                generateMaterialVerificationPdf([po]);
                                                            }}
                                                            title="Download PDF"
                                                            className="flex items-center gap-1.5 bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            PDF
                                                        </button>

                                                        {/* XLSX */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                exportMaterialVerificationXlsx([po]);
                                                            }}
                                                            title="Export XLSX"
                                                            className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            <FileSpreadsheet className="w-4 h-4" />
                                                            XLSX
                                                        </button>

                                                        {/* CSV */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                exportMaterialVerificationCsv([po]);
                                                            }}
                                                            title="Export CSV"
                                                            className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            <FileDown className="w-4 h-4" />
                                                            CSV
                                                        </button>

                                                        {/* Delete — admin only */}
                                                        {isAdmin && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(po._id); }}
                                                                title="Delete"
                                                                className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Previous Receipts History Table */}
                                                {po.items && po.items.length > 0 && (
                                                    <div className="space-y-4">
                                                        {po.receipts && po.receipts.length > 0 && (
                                                            <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-4">
                                                                <h4 className="text-sm font-semibold text-foreground/90 uppercase tracking-wide">Delivery History ({po.receipts.length})</h4>
                                                                <div className="space-y-3">
                                                                    {po.receipts.map((receipt, rIndex) => (
                                                                        <div key={rIndex} className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm">
                                                                            <div className="flex justify-between items-center mb-2">
                                                                                <div className="flex gap-4">
                                                                                    <span className="font-medium text-foreground">Date: {formatDate(receipt.date)}</span>
                                                                                    <span className="text-muted-foreground">Received By: {receipt.receivedBy || 'N/A'}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-3">
                                                                                    {receipt.maalPraptiRasidUrl && (
                                                                                        <button
                                                                                            onClick={async () => {
                                                                                                try {
                                                                                                    const url = await uploadService.getSignedUrl(receipt.maalPraptiRasidUrl);
                                                                                                    window.open(url, '_blank');
                                                                                                } catch (e) {
                                                                                                    toast.error("Failed to load receipt document.");
                                                                                                }
                                                                                            }}
                                                                                            className="text-primary hover:text-primary/80 flex gap-1 items-center bg-primary/10 px-2 py-1 rounded"
                                                                                        >
                                                                                            <CheckCircle2 className="w-4 h-4" /> View Rasid
                                                                                        </button>
                                                                                    )}
                                                                                    {isAdmin && editReceiptId !== receipt._id && (
                                                                                        <>
                                                                                            <button onClick={(e) => { e.stopPropagation(); startEditReceipt(po, receipt); }} className="text-yellow-500 hover:text-yellow-400 p-1" title="Edit Receipt">
                                                                                                <Edit2 className="w-4 h-4" />
                                                                                            </button>
                                                                                            <button onClick={(e) => { e.stopPropagation(); setDeleteReceiptConfirm({ poId: po._id, receiptId: receipt._id }); }} className="text-red-500 hover:text-red-400 p-1" title="Delete Receipt">
                                                                                                <Trash2 className="w-4 h-4" />
                                                                                            </button>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {editReceiptId === receipt._id ? (
                                                                                <div className="mt-4 p-3 bg-black/40 border border-primary/20 rounded-lg animate-in fade-in">
                                                                                    <div className="mb-3 flex justify-between items-center border-b border-primary/20 pb-2">
                                                                                        <h5 className="font-medium text-primary flex items-center gap-2"><Edit2 className="w-4 h-4" /> Edit Receipt Quantities</h5>
                                                                                        <button onClick={cancelEditReceipt} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                                                                                    </div>
                                                                                    <div className="mb-4">
                                                                                        <label className="text-xs text-muted-foreground mb-1 block">Update Maal Prapti Rasid (Replaces old)</label>
                                                                                        <FileUploadSelector
                                                                                            accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png"
                                                                                            onFileSelect={(file) => setEditMaalPraptiFile(file)}
                                                                                            title="Upload Maal Prapti Rasid"
                                                                                        >
                                                                                            <button type="button" className="w-full text-left text-xs text-primary bg-primary/20 py-2 px-4 rounded-full font-semibold hover:bg-primary/30 transition-colors">
                                                                                                {editMaalPraptiFile ? editMaalPraptiFile.name : "Select File or Take Photo"}
                                                                                            </button>
                                                                                        </FileUploadSelector>
                                                                                    </div>
                                                                                    <div className="space-y-3 mb-4">
                                                                                        {po.items.map(poItem => (
                                                                                            <div key={poItem._id} className="flex flex-col gap-2 bg-white/5 p-3 rounded border border-white/5">
                                                                                                <div className="flex justify-between items-center">
                                                                                                    <span className="font-medium text-foreground">{poItem.materialDescription}</span>
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        min="0"
                                                                                                        step="0.01"
                                                                                                        className="w-24 px-2 py-1 text-right bg-black border border-primary/20 rounded text-sm text-primary outline-none focus:border-primary/60"
                                                                                                        value={editReceiptQuantities[poItem._id] ?? ''}
                                                                                                        onChange={(e) => handleEditQuantityChange(poItem._id, e.target.value)}
                                                                                                    />
                                                                                                </div>
                                                                                                <div className="flex flex-col sm:flex-row gap-2">
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        placeholder="Optional remarks"
                                                                                                        value={editReceiptRemarks[poItem._id] ?? ''}
                                                                                                        onChange={(e) => handleEditRemarkChange(poItem._id, e.target.value)}
                                                                                                        className="flex-1 px-2 py-1 text-xs bg-black/60 border border-primary/20 rounded focus:border-primary/60 focus:outline-none placeholder:text-muted-foreground/30 text-foreground"
                                                                                                    />
                                                                                                    <div className="relative w-full sm:w-auto">
                                                                                                        <FileUploadSelector
                                                                                                            accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png"
                                                                                                            onFileSelect={(file) => handleEditImageChange(poItem._id, file)}
                                                                                                            title="Upload Item Image"
                                                                                                        >
                                                                                                            <button type="button" className={`w-full flex justify-center sm:justify-start items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${editReceiptImages[poItem._id] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-foreground hover:bg-white/15'}`}>
                                                                                                                <UploadCloud className="w-3.5 h-3.5" />
                                                                                                                {editReceiptImages[poItem._id] ? 'New File Ready' : 'Replace Image'}
                                                                                                            </button>
                                                                                                        </FileUploadSelector>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                    <div className="flex justify-end gap-2">
                                                                                        <button onClick={cancelEditReceipt} className="px-3 py-1.5 rounded text-xs text-muted-foreground hover:bg-white/10">Cancel</button>
                                                                                        <button onClick={() => handleSaveReceiptEdit(po, receipt._id)} disabled={isUpdatingReceipt} className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded hover:bg-primary/90 disabled:opacity-50">
                                                                                            <Save className="w-4 h-4" /> {isUpdatingReceipt ? 'Saving...' : 'Save Changes'}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="space-y-2 mt-2">
                                                                                    {receipt.items.map((rItem, iIndex) => (
                                                                                        <div key={iIndex} className="text-xs bg-black/40 px-3 py-2 rounded flex flex-col gap-1 border border-white/5">
                                                                                            <div className="flex justify-between items-center">
                                                                                                <span className="text-foreground font-medium">{rItem.materialDescription}</span>
                                                                                                <span className="text-primary font-semibold text-right">{rItem.quantityReceived}</span>
                                                                                            </div>
                                                                                            {(rItem.qualityCheckRemarks || rItem.itemImageUrl) && (
                                                                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1 pt-1 border-t border-white/5">
                                                                                                    {rItem.qualityCheckRemarks ? (
                                                                                                        <span className="text-muted-foreground italic">&ldquo;{rItem.qualityCheckRemarks}&rdquo;</span>
                                                                                                    ) : (
                                                                                                        <span /> /* Spacer */
                                                                                                    )}
                                                                                                    {rItem.itemImageUrl && (
                                                                                                        <button
                                                                                                            onClick={async (e) => {
                                                                                                                e.stopPropagation();
                                                                                                                try {
                                                                                                                    const url = await uploadService.getSignedUrl(rItem.itemImageUrl);
                                                                                                                    window.open(url, '_blank');
                                                                                                                } catch (err) {
                                                                                                                    toast.error("Failed to load item image.");
                                                                                                                }
                                                                                                            }}
                                                                                                            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded w-max"
                                                                                                        >
                                                                                                            <CheckCircle2 className="w-3 h-3" /> View Image
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1e1e2d]/50">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-black/40 text-muted-foreground">
                                                                    <tr>
                                                                        <th className="text-left py-3 px-4 font-medium">Description</th>
                                                                        <th className="text-left py-3 px-4 font-medium">Unit</th>
                                                                        <th className="text-right py-3 px-4 font-medium">Ordered Qty</th>
                                                                        <th className="text-right py-3 px-4 font-medium text-blue-400">Total Received</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-white/10">
                                                                    {po.items.map((item) => (
                                                                        <tr key={item._id} className="hover:bg-white/5 transition-colors">
                                                                            <td className="py-2.5 px-4 text-foreground/90 font-medium">{item.materialDescription}</td>
                                                                            <td className="py-2.5 px-4 text-muted-foreground">{item.unit}</td>
                                                                            <td className="py-2.5 px-4 text-right text-foreground/80">{item.quantity}</td>
                                                                            <td className="py-2.5 px-4 text-right text-foreground font-medium">
                                                                                {item.receivedQuantity || 0}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {/* New Delivery Action Area */}
                                                        {hasEditAccess && po.materialVerificationStatus !== 'Verified' && (
                                                            <div className="mt-4">
                                                                {!showNewDelivery ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            // Make sure to reset state when tracking a new delivery
                                                                            const initialQtys = {};
                                                                            const initialRemarks = {};
                                                                            const initialImages = {};
                                                                            po.items?.forEach(item => {
                                                                                initialQtys[item._id] = '';
                                                                                initialRemarks[item._id] = '';
                                                                                initialImages[item._id] = null;
                                                                            });
                                                                            setLocalQuantities(initialQtys);
                                                                            setLocalRemarks(initialRemarks);
                                                                            setLocalImages(initialImages);
                                                                            setMaalPraptiFile(null);
                                                                            setShowNewDelivery(true);
                                                                        }}
                                                                        className="flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm w-full justify-center"
                                                                    >
                                                                        <ShoppingCart className="w-4 h-4" />
                                                                        Record New Delivery
                                                                    </button>
                                                                ) : (
                                                                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-2 mb-4 animate-in fade-in slide-in-from-top-4">
                                                                        <div className="flex justify-between items-center mb-4">
                                                                            <h4 className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
                                                                                <ShoppingCart className="w-4 h-4" /> New Delivery Details
                                                                            </h4>
                                                                            <button
                                                                                onClick={() => setShowNewDelivery(false)}
                                                                                className="text-xs text-muted-foreground hover:text-foreground"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>

                                                                        <div className="mb-4">
                                                                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Upload Maal Prapti Rasid (Optional)</label>
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="relative">
                                                                                    <FileUploadSelector
                                                                                        accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png"
                                                                                        onFileSelect={(file) => setMaalPraptiFile(file)}
                                                                                        title="Upload Maal Prapti Rasid"
                                                                                    >
                                                                                        <button type="button" className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg text-sm transition-colors text-foreground">
                                                                                            <UploadCloud className="w-4 h-4 text-primary" />
                                                                                            {maalPraptiFile ? maalPraptiFile.name : "Select File"}
                                                                                        </button>
                                                                                    </FileUploadSelector>
                                                                                </div>
                                                                                {maalPraptiFile && (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-xs font-medium text-yellow-400">Ready to Upload</span>
                                                                                        <button
                                                                                            onClick={() => setMaalPraptiFile(null)}
                                                                                            className="p-1 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 rounded transition-colors"
                                                                                            title="Clear attached reshit"
                                                                                        >
                                                                                            <X className="w-3 h-3" />
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="overflow-x-auto rounded-lg border border-primary/10 bg-black/20">
                                                                            <table className="w-full text-sm">
                                                                                <thead className="bg-primary/10 text-primary/80">
                                                                                    <tr>
                                                                                        <th className="text-left py-2 px-3 font-medium">Description</th>
                                                                                        <th className="text-right py-2 px-3 font-medium">Pending Qty</th>
                                                                                        <th className="text-right py-2 px-3 font-medium text-primary">Incoming Qty</th>
                                                                                        <th className="text-left py-2 px-3 font-medium">Quality Remarks</th>
                                                                                        <th className="text-center py-2 px-3 font-medium">Image</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-primary/10">
                                                                                    {po.items.map((item) => {
                                                                                        const pending = item.quantity - (item.receivedQuantity || 0);
                                                                                        if (pending <= 0) return null; // Only show pending items
                                                                                        return (
                                                                                            <tr key={item._id} className="hover:bg-primary/5 transition-colors">
                                                                                                <td className="py-2 px-3 text-foreground/90 font-medium">{item.materialDescription}</td>
                                                                                                <td className="py-2 px-3 text-right text-muted-foreground">{pending}</td>
                                                                                                <td className="py-2 px-3 text-right">
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        min="0"
                                                                                                        max={pending}
                                                                                                        step="0.01"
                                                                                                        className="w-24 px-2 py-1 text-right bg-black/60 border border-primary/20 rounded focus:border-primary/60 focus:outline-none placeholder:text-muted-foreground/30 text-primary font-medium"
                                                                                                        placeholder="0"
                                                                                                        value={localQuantities[item._id] ?? ''}
                                                                                                        onChange={(e) => handleQuantityChange(item._id, e.target.value)}
                                                                                                    />
                                                                                                </td>
                                                                                                <td className="py-2 px-3 text-left">
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        placeholder="Optional remarks"
                                                                                                        value={localRemarks[item._id] ?? ''}
                                                                                                        onChange={(e) => handleRemarkChange(item._id, e.target.value)}
                                                                                                        className="w-48 px-2 py-1 text-sm bg-black/60 border border-primary/20 rounded focus:border-primary/60 focus:outline-none placeholder:text-muted-foreground/30 text-foreground"
                                                                                                    />
                                                                                                </td>
                                                                                                <td className="py-2 px-3 text-center">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className="relative inline-block border border-white/10 rounded-lg pr-1">
                                                                                                            <FileUploadSelector
                                                                                                                accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png"
                                                                                                                onFileSelect={(file) => handleImageChange(item._id, file)}
                                                                                                                title="Upload Item Image"
                                                                                                            >
                                                                                                                <button type="button" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${localImages[item._id] ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-transparent hover:bg-white/5 text-foreground'}`}>
                                                                                                                    <UploadCloud className="w-3.5 h-3.5" />
                                                                                                                    {localImages[item._id] ? "Selected" : "Upload"}
                                                                                                                </button>
                                                                                                            </FileUploadSelector>
                                                                                                            {localImages[item._id] && (
                                                                                                                <button
                                                                                                                    onClick={() => handleImageChange(item._id, null)}
                                                                                                                    className="absolute -right-2 -top-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-lg transition-colors z-10"
                                                                                                                    title="Clear item image"
                                                                                                                >
                                                                                                                    <X className="w-3 h-3" />
                                                                                                                </button>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        );
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>

                                                                        <div className="mt-4 flex justify-end">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleSaveVerification(po);
                                                                                }}
                                                                                disabled={isSaving || isUploading}
                                                                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
                                                                            >
                                                                                <Save className="w-4 h-4" />
                                                                                {isSaving || isUploading ? "Saving Delivery..." : "Save Delivery"}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    });
                })()}
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => !isDeleting && setDeleteConfirmId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="bg-[#1a1a2e] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Icon */}
                            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 mx-auto mb-5">
                                <Trash2 className="w-7 h-7 text-red-400" />
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-bold text-foreground text-center mb-2">Clear Verification Data?</h3>

                            {/* Subtitle with PO number */}
                            <p className="text-sm text-muted-foreground text-center mb-1">
                                You are about to clear all verification data for:
                            </p>
                            <p className="text-center mb-4">
                                <span className="font-mono font-semibold text-red-400 bg-red-500/10 px-3 py-1 rounded-lg text-sm">
                                    {purchaseOrders.find(p => p._id === deleteConfirmId)?.poNumber || 'this PO'}
                                </span>
                            </p>
                            <p className="text-xs text-muted-foreground text-center mb-6">
                                ⚠️ This will reset all Received Quantities to 0 and remove the Maal Prapti Rasid. The Purchase Order itself will <strong>not</strong> be deleted.
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/15 text-foreground transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirmId)}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-red-500/80 hover:bg-red-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                                    ) : (
                                        <><Trash2 className="w-4 h-4" /> Yes, Delete</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Receipt Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteReceiptConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => !isDeleting && setDeleteReceiptConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="bg-[#1a1a2e] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Icon */}
                            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 mx-auto mb-5">
                                <Trash2 className="w-7 h-7 text-red-400" />
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-bold text-foreground text-center mb-2">Delete Delivery Receipt?</h3>

                            {/* Subtitle */}
                            <p className="text-sm text-muted-foreground text-center mb-6">
                                Are you sure you want to delete this specific delivery receipt? This will adjust the available Pending Quantities accordingly.
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteReceiptConfirm(null)}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/15 text-foreground transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteReceipt}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-red-500/80 hover:bg-red-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                                    ) : (
                                        <><Trash2 className="w-4 h-4" /> Yes, Delete</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default MaterialVerificationsList;
