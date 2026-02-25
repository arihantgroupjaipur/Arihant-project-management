import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ShoppingCart, Save, FileCheck, UploadCloud, FileText, CheckCircle2, Trash2, FileSpreadsheet, FileDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { updateMaterialVerification, resetMaterialVerification } from "@/services/purchaseOrderService";
import { uploadService } from "@/services/uploadService";
import { generateMaterialVerificationPdf } from "@/utils/materialVerificationPdfExport";
import { exportMaterialVerificationXlsx } from "@/utils/materialVerificationXlsxExport";
import { exportMaterialVerificationCsv } from "@/utils/materialVerificationCsvExport";

const MaterialVerificationsList = ({
    purchaseOrders,
    searchQuery,
    filterStatus,
    isAdmin,
    canEdit,
    onVerificationSuccess
}) => {
    // canEdit allows engineers to also edit; falls back to isAdmin for backwards compat
    const hasEditAccess = canEdit || isAdmin;
    const [expandedId, setExpandedId] = useState(null);
    const [localQuantities, setLocalQuantities] = useState({});
    const [maalPraptiFile, setMaalPraptiFile] = useState(null);
    const [maalPraptiPreviewUrl, setMaalPraptiPreviewUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
        } else {
            setExpandedId(po._id);
            const initialQtys = {};
            po.items?.forEach(item => {
                initialQtys[item._id] = item.receivedQuantity > 0 ? item.receivedQuantity : '';
            });
            setLocalQuantities(initialQtys);
            setMaalPraptiFile(null);

            if (po.maalPraptiRasidUrl) {
                try {
                    const url = await uploadService.getSignedUrl(po.maalPraptiRasidUrl);
                    setMaalPraptiPreviewUrl(url);
                } catch (error) {
                    console.error("Failed to load receipt URL", error);
                    setMaalPraptiPreviewUrl(null);
                }
            } else {
                setMaalPraptiPreviewUrl(null);
            }
        }
    };

    const handleQuantityChange = (itemId, value) => {
        setLocalQuantities(prev => ({
            ...prev,
            [itemId]: value
        }));
    };

    const handleSaveVerification = async (po) => {
        if (!po || isSaving || isUploading) return;

        if (!hasEditAccess) {
            toast.error("You don't have permission to update material verifications.");
            return;
        }

        try {
            setIsSaving(true);
            let payload = {
                items: po.items.map(item => ({
                    _id: item._id,
                    receivedQuantity: Number(localQuantities[item._id]) || 0
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
            toast.success("Material verification updated successfully!");

            // Re-fetch temporary URL for fast ui feedback
            if (payload.maalPraptiRasidUrl) {
                const newUrl = await uploadService.getSignedUrl(payload.maalPraptiRasidUrl);
                setMaalPraptiPreviewUrl(newUrl);
            }
            setMaalPraptiFile(null); // Clear pending upload

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
                            po.indentReference?.indentNumber?.toLowerCase().includes(q);

                        let poStatus = po.materialVerificationStatus || 'Pending';
                        const matchStatus = filterStatus === 'all' || poStatus === filterStatus;

                        return matchSearch && matchStatus;
                    });

                    if (filtered.length === 0) {
                        return <div className="text-center py-8 text-muted-foreground glass-card rounded-xl">No Purchase Orders match your criteria.</div>;
                    }

                    return filtered.map((po) => {
                        const status = po.materialVerificationStatus || 'Pending';

                        return (
                            <motion.div
                                key={po._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card overflow-hidden"
                            >
                                <button
                                    onClick={() => handleExpand(po)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
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
                                                <span>Indent: {po.indentReference?.indentNumber || 'N/A'}</span>
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
                                </button>

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
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Maal Prapti Rasid</p>
                                                        <div className="flex items-center gap-3">
                                                            {hasEditAccess && (
                                                                <div className="relative">
                                                                    <input
                                                                        type="file"
                                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                        onChange={(e) => {
                                                                            if (e.target.files && e.target.files[0]) {
                                                                                setMaalPraptiFile(e.target.files[0]);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg text-sm transition-colors text-foreground">
                                                                        <UploadCloud className="w-4 h-4 text-primary" />
                                                                        {maalPraptiFile ? maalPraptiFile.name : (po.maalPraptiRasidUrl ? "Replace File" : "Upload File")}
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {maalPraptiFile && (
                                                                <span className="text-xs font-medium text-yellow-400 flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                                                                    Pending Save
                                                                </span>
                                                            )}
                                                            {!maalPraptiFile && maalPraptiPreviewUrl && (
                                                                <a
                                                                    href={maalPraptiPreviewUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                    View Document
                                                                </a>
                                                            )}
                                                            {!maalPraptiFile && !maalPraptiPreviewUrl && (
                                                                <span className="text-sm text-muted-foreground italic">Not Attached</span>
                                                            )}
                                                        </div>
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

                                                {/* Items Verification Table */}
                                                {po.items && po.items.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="text-sm font-semibold text-foreground/90 uppercase tracking-wide">Enter Received Quantities</h4>
                                                        </div>
                                                        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1e1e2d]/50">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-black/40 text-muted-foreground">
                                                                    <tr>
                                                                        <th className="text-left py-3 px-4 font-medium">Description</th>
                                                                        <th className="text-left py-3 px-4 font-medium">Unit</th>
                                                                        <th className="text-right py-3 px-4 font-medium">Ordered Qty</th>
                                                                        <th className="text-right py-3 px-4 font-medium text-primary">Received Qty</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-white/10">
                                                                    {po.items.map((item) => (
                                                                        <tr key={item._id} className="hover:bg-white/5 transition-colors">
                                                                            <td className="py-2.5 px-4 text-foreground/90 font-medium">{item.materialDescription}</td>
                                                                            <td className="py-2.5 px-4 text-muted-foreground">{item.unit}</td>
                                                                            <td className="py-2.5 px-4 text-right text-foreground/80">{item.quantity}</td>
                                                                            <td className="py-2.5 px-4 text-right">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    disabled={!hasEditAccess}
                                                                                    className="w-24 px-2 py-1 text-right bg-black/40 border border-white/10 rounded focus:border-primary/50 focus:outline-none disabled:opacity-50"
                                                                                    value={localQuantities[item._id] ?? ''}
                                                                                    onChange={(e) => handleQuantityChange(item._id, e.target.value)}
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <div className="mt-4 flex justify-end">
                                                            {hasEditAccess && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSaveVerification(po);
                                                                    }}
                                                                    disabled={isSaving || isUploading}
                                                                    className="flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                                                                >
                                                                    <Save className="w-4 h-4" />
                                                                    {isSaving || isUploading ? "Saving..." : "Save Changes"}
                                                                </button>
                                                            )}
                                                        </div>
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
        </>
    );
};

export default MaterialVerificationsList;
