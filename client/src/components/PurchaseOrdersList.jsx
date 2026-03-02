import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, ChevronDown, Sheet, File, FileText, ShoppingCart, FileCheck, Upload, Eye, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { generatePurchaseOrderPDF } from '@/utils/purchaseOrderPdfExport';
import { generatePurchaseOrderExcel } from '@/utils/purchaseOrderExcelExport';
import { generatePurchaseOrderCSV } from '@/utils/purchaseOrderCsvExport';
import { uploadService } from '@/services/uploadService';
import { uploadPurchaseOrderPdf, removePurchaseOrderPdf } from '@/services/purchaseOrderService';
import { useQueryClient } from '@tanstack/react-query';

const PurchaseOrdersList = ({
    purchaseOrders,
    onEdit,
    onDelete,
    isAdmin,
    searchQuery,
    filterStatus,
    canChangeStatus,
    onStatusChange,
    onNavigateToVerification
}) => {
    const [expandedId, setExpandedId] = useState(null);
    const [deleteModalData, setDeleteModalData] = useState(null);
    const [uploadingId, setUploadingId] = useState(null);
    const queryClient = useQueryClient();

    const handlePdfUpload = async (po, file) => {
        if (!file) return;
        setUploadingId(po._id);
        try {
            await uploadPurchaseOrderPdf(po._id, file);
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            toast.success('PDF uploaded and attached to Purchase Order!');
        } catch (err) {
            toast.error('Failed to upload PDF');
        } finally {
            setUploadingId(null);
        }
    };

    const handleViewPdf = async (po) => {
        try {
            const url = await uploadService.getSignedUrl(po.uploadedPdf);
            window.open(url, '_blank');
        } catch {
            toast.error('Failed to open file');
        }
    };

    const handleRemovePdf = async (po) => {
        try {
            await uploadService.deleteImage(po.uploadedPdf);
            await removePurchaseOrderPdf(po._id);
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            toast.success('Attachment removed');
        } catch {
            toast.error('Failed to remove attachment');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'dd/MM/yyyy');
        } catch (error) {
            return dateString;
        }
    };

    return (
        <div className="space-y-4">
            {(() => {
                const q = searchQuery.toLowerCase();
                const filtered = purchaseOrders.filter(po => {
                    const matchSearch = !q ||
                        po.poNumber?.toLowerCase().includes(q) ||
                        po.vendorName?.toLowerCase().includes(q) ||
                        po.taskReference?.toLowerCase().includes(q) ||
                        (po.indentReferences && po.indentReferences.some(i => i?.indentNumber?.toLowerCase().includes(q)));

                    const matchStatus = filterStatus === 'all' || po.status === filterStatus;
                    return matchSearch && matchStatus;
                });

                if (filtered.length === 0) {
                    return <div className="text-center py-8 text-muted-foreground glass-card rounded-xl">No Purchase Orders match your criteria.</div>;
                }

                return filtered.map((po) => (
                    <motion.div
                        key={po._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card overflow-hidden"
                    >
                        <div
                            onClick={() => setExpandedId(expandedId === po._id ? null : po._id)}
                            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-xl text-primary shrink-0">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-foreground text-base">{po.poNumber}</h3>
                                        {canChangeStatus ? (
                                            <select
                                                value={po.status}
                                                onChange={(e) => onStatusChange(po._id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/20 ${po.status === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    po.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                    }`}
                                            >
                                                <option value="Pending" className="bg-[#1e1e2d] text-yellow-400">Pending</option>
                                                <option value="Approved" className="bg-[#1e1e2d] text-green-400">Approved</option>
                                                <option value="Rejected" className="bg-[#1e1e2d] text-red-400">Rejected</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${po.status === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                po.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                }`}>
                                                {po.status}
                                            </span>
                                        )}
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
                                <div className="hidden sm:block text-right mr-4">
                                    <p className="text-xs text-muted-foreground mb-0.5">Total Amount</p>
                                    <p className="font-semibold text-gradient-primary">
                                        ₹{Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>

                                {expandedId === po._id && (
                                    <div className="flex items-center gap-2 mr-2 hidden sm:flex" onClick={(e) => e.stopPropagation()}>
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            onClick={() => generatePurchaseOrderPDF([po])}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                                            title="Export as PDF"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            <span className="text-xs font-medium">PDF</span>
                                        </motion.button>
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.05 }}
                                            onClick={() => generatePurchaseOrderExcel([po])}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                                            title="Export as Excel"
                                        >
                                            <Sheet className="w-3.5 h-3.5" />
                                            <span className="text-xs font-medium">XLS</span>
                                        </motion.button>
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.1 }}
                                            onClick={() => generatePurchaseOrderCSV([po])}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                                            title="Export as CSV"
                                        >
                                            <File className="w-3.5 h-3.5" />
                                            <span className="text-xs font-medium">CSV</span>
                                        </motion.button>

                                        {/* Upload PDF */}
                                        {uploadingId === po._id ? (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-muted-foreground ml-2">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span className="text-xs">Uploading…</span>
                                            </div>
                                        ) : po.uploadedPdf ? (
                                            <>
                                                <motion.button
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    onClick={(e) => { e.stopPropagation(); handleViewPdf(po); }}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 transition-colors ml-2 border border-sky-500/20"
                                                    title="View uploaded PDF"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">View PDF</span>
                                                </motion.button>
                                                {isAdmin && (
                                                    <motion.button
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        onClick={(e) => { e.stopPropagation(); handleRemovePdf(po); }}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors border border-red-500/20"
                                                        title="Remove uploaded PDF"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </motion.button>
                                                )}
                                            </>
                                        ) : (
                                            <motion.label
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.15 }}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 transition-colors ml-2 border border-sky-500/20 cursor-pointer"
                                                title="Upload PDF for this Purchase Order"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">Upload PDF</span>
                                                <input
                                                    type="file"
                                                    accept="application/pdf,.pdf,.doc,.docx,image/*"
                                                    className="hidden"
                                                    onChange={(e) => handlePdfUpload(po, e.target.files[0])}
                                                />
                                            </motion.label>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center gap-1 sm:gap-2 mr-2 sm:mr-4" onClick={(e) => e.stopPropagation()}>
                                    {onNavigateToVerification && (
                                        <button
                                            onClick={() => onNavigateToVerification(po._id)}
                                            className="p-2 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors"
                                            title="Go to Material Verification"
                                        >
                                            <FileCheck className="w-4 h-4" />
                                        </button>
                                    )}

                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={() => onEdit(po)}
                                                className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                                                title="Edit PO"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteModalData(po);
                                                }}
                                                className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                                title="Delete PO"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
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
                                        {/* Reference Information */}
                                        <div className="grid md:grid-cols-3 gap-6">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Related Task</p>
                                                <p className="font-medium text-sm text-foreground/90">{po.taskReference || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total Items</p>
                                                <p className="font-medium text-sm text-foreground/90">{po.items?.length || 0}</p>
                                            </div>
                                            <div className="sm:hidden">
                                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total Amount</p>
                                                <p className="font-medium text-sm text-primary">₹{Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>

                                        {/* Items Table */}
                                        {po.items && po.items.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold mb-3 text-foreground/90 uppercase tracking-wide">Item Breakdown</h4>
                                                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1e1e2d]/50">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-black/40 text-muted-foreground">
                                                            <tr>
                                                                <th className="text-left py-3 px-4 font-medium">Description</th>
                                                                <th className="text-left py-3 px-4 font-medium">Unit</th>
                                                                <th className="text-right py-3 px-4 font-medium">Qty</th>
                                                                <th className="text-right py-3 px-4 font-medium">Rate (₹)</th>
                                                                <th className="text-right py-3 px-4 font-medium">Tax (₹)</th>
                                                                <th className="text-right py-3 px-4 font-medium">Amount (₹)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/10">
                                                            {po.items.map((item, idx) => (
                                                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                                    <td className="py-2.5 px-4 text-foreground/90">{item.materialDescription}</td>
                                                                    <td className="py-2.5 px-4 text-muted-foreground">{item.unit}</td>
                                                                    <td className="py-2.5 px-4 text-right text-foreground/90">{item.quantity}</td>
                                                                    <td className="py-2.5 px-4 text-right text-foreground/80">{Number(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                                    <td className="py-2.5 px-4 text-right text-muted-foreground">{Number(item.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                                    <td className="py-2.5 px-4 text-right font-medium text-primary/90">{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot className="bg-black/20 border-t border-white/10">
                                                            <tr>
                                                                <td colSpan="5" className="py-3 px-4 text-right font-medium text-muted-foreground uppercase text-xs tracking-wider">Subtotal</td>
                                                                <td className="py-3 px-4 text-right font-medium text-foreground">₹{Number(po.subTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                            </tr>
                                                            <tr>
                                                                <td colSpan="5" className="py-2 px-4 text-right font-medium text-muted-foreground uppercase text-xs tracking-wider border-none">Freight</td>
                                                                <td className="py-2 px-4 text-right font-medium text-foreground border-none">₹{Number(po.freight).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                            </tr>
                                                            <tr className="border-t border-white/10">
                                                                <td colSpan="5" className="py-3 px-4 text-right font-bold text-primary uppercase text-xs tracking-wider">Grand Total</td>
                                                                <td className="py-3 px-4 text-right font-bold text-primary">₹{Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* PO Specifics split into columns */}
                                        <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Vendor Reference</p>
                                                    <div className="text-sm space-y-0.5">
                                                        {po.vendorAddress && <p className="text-muted-foreground flex items-start gap-2"><span className="shrink-0 text-muted-foreground/50">Add:</span> {po.vendorAddress}</p>}
                                                        {po.vendorGst && <p className="text-muted-foreground flex items-center gap-2"><span className="shrink-0 text-muted-foreground/50">GST:</span> {po.vendorGst}</p>}
                                                        {po.vendorContactNo && <p className="text-muted-foreground flex items-center gap-2"><span className="shrink-0 text-muted-foreground/50">Ph:</span> {po.vendorContactNo}</p>}
                                                    </div>
                                                </div>

                                                {po.comments && (
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Comments & Instructions</p>
                                                        <p className="text-sm text-foreground bg-white/5 p-3 rounded-lg border border-white/10 whitespace-pre-wrap">{po.comments}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Ship To</p>
                                                    <div className="text-sm space-y-0.5">
                                                        <p className="font-medium text-foreground">{po.shipToCompanyName || "N/A"}</p>
                                                        <p className="text-muted-foreground">{po.shipToAddress || "N/A"}</p>
                                                        {(po.shipToContactPerson || po.shipToContactNo) && (
                                                            <p className="text-muted-foreground mt-1 text-xs">
                                                                Attn: {[po.shipToContactPerson, po.shipToContactNo].filter(Boolean).join(" - ")}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quotations Bar */}
                                        <div className="pt-4 border-t border-white/10 mt-6">
                                            <h4 className="text-sm font-semibold mb-3 text-foreground/90 uppercase tracking-wide">Quotations & Approvals</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                {[1, 2, 3].map(num => {
                                                    const url = po[`quotation${num}Url`];
                                                    const isApproved = po.approvedQuotation === `quotation${num}`;

                                                    return (
                                                        <div key={`quotation${num}`} className={`p-3 rounded-lg border ${isApproved ? 'bg-green-500/10 border-green-500/20' : 'bg-black/20 border-white/5'}`}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1.5">
                                                                    Quotation {num}
                                                                </p>
                                                                {isApproved && (
                                                                    <span className="text-[9px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                        Approved
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {url ? (
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        try {
                                                                            const signedUrl = await uploadService.getSignedUrl(url);
                                                                            window.open(signedUrl, '_blank');
                                                                        } catch (error) {
                                                                            toast.error("Failed to open document");
                                                                        }
                                                                    }}
                                                                    className={`flex items-center gap-2 text-sm font-medium transition-colors mt-2 ${isApproved ? 'text-green-400 hover:text-green-300' : 'text-primary hover:text-primary/80'}`}
                                                                >
                                                                    <File className="w-4 h-4" />
                                                                    View Document
                                                                </button>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground/50 italic mt-2">
                                                                    Not Attached
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Authorizations Bar */}
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-sm">
                                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Prepared By</p>
                                                <p className="font-medium text-foreground/90">{po.preparedBy || "-"}</p>
                                            </div>
                                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Verified By</p>
                                                <p className="font-medium text-foreground/90">{po.verifiedBy || "-"}</p>
                                            </div>
                                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Authorized By</p>
                                                <p className="font-medium text-foreground/90">{po.authorizedBy || "-"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ));
            })()}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteModalData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setDeleteModalData(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#1e1e2d] z-10"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mb-4 mx-auto">
                                    <Trash2 className="w-6 h-6 text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-center text-foreground mb-2">Delete Purchase Order</h3>
                                <p className="text-center text-muted-foreground mb-6">
                                    Are you sure you want to delete <span className="font-semibold text-foreground">{deleteModalData.poNumber}</span>? This action cannot be undone.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setDeleteModalData(null)}
                                        className="px-4 py-2.5 rounded-xl font-medium text-foreground bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            onDelete(deleteModalData._id);
                                            setDeleteModalData(null);
                                        }}
                                        className="px-4 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
                                    >
                                        Delete Forever
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PurchaseOrdersList;
