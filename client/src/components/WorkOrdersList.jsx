import { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Edit, Trash2, FileText, Calendar, File, Sheet, Link as LinkIcon, Download, ClipboardCheck, Upload, Loader2, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { generateWorkOrderPDF } from "@/utils/workOrderPdfExport";
import { generateWorkOrderExcel } from "@/utils/workOrderExcelExport";
import { generateWorkOrderCSV } from "@/utils/workOrderCsvExport";
import { useNavigate } from "react-router-dom";
import { workOrderService } from "@/services/workOrderService";
import { uploadService } from "@/services/uploadService";
import { useQueryClient } from "@tanstack/react-query";

const WorkOrdersList = ({ workOrders, hasMore, isLoadingMore, onLoadMore, onCreateNew, isAdmin = false, onEdit, onDelete, onCreateCertification, onSuccessUpload }) => {
    const [expandedId, setExpandedId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadingId, setUploadingId] = useState(null);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handlePdfUpload = async (order, file) => {
        if (!file) return;
        setUploadingId(order._id);
        try {
            await workOrderService.uploadWorkOrderPdf(order._id, file);
            if (onSuccessUpload) onSuccessUpload();
            toast.success('PDF uploaded and attached to Work Order!');
        } catch (err) {
            console.error('PDF upload failed:', err);
            toast.error('Failed to upload PDF');
        } finally {
            setUploadingId(null);
        }
    };

    const handleViewPdf = async (order) => {
        try {
            const url = await uploadService.getSignedUrl(order.uploadedPdf);
            window.open(url, '_blank');
        } catch (err) {
            toast.error('Failed to open file');
        }
    };

    const handleRemovePdf = async (order) => {
        try {
            await uploadService.deleteImage(order.uploadedPdf);
            await workOrderService.removeWorkOrderPdf(order._id);
            if (onSuccessUpload) onSuccessUpload();
            toast.success('Attachment removed');
        } catch (err) {
            toast.error('Failed to remove attachment');
        }
    };

    const handleExport = async (type, order, e) => {
        e.stopPropagation(); // Prevent expanding the card
        const exportType = type.toUpperCase();

        try {
            if (type === 'pdf') {
                await generateWorkOrderPDF(order);
                toast.success(`Work Order PDF downloaded successfully!`);
            } else if (type === 'xlsx') {
                generateWorkOrderExcel(order);
                toast.success(`Work Order Excel file downloaded successfully!`);
            } else if (type === 'csv') {
                generateWorkOrderCSV(order);
                toast.success(`Work Order CSV file downloaded successfully!`);
            }
        } catch (error) {
            console.error(`${exportType} export error: `, error);
            toast.error(`Failed to generate ${exportType} file`);
        }
    };

    if (workOrders.length === 0) {
        return (
            <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-purple-400/50" />
                <h3 className="text-xl font-semibold mb-2">No Work Orders Yet</h3>
                <p className="text-muted-foreground mb-6">Create your first work order to get started</p>
                <motion.button
                    onClick={onCreateNew}
                    className="bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Create Work Order
                </motion.button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Work Orders</h2>
                    <p className="text-muted-foreground">Manage all project work orders</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input type="text" placeholder="Search WO#, location, supervisor…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-full sm:w-64" />
                    </div>
                    <motion.button
                        onClick={onCreateNew}
                        className="bg-purple-500 text-white px-4 py-2 rounded-xl font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FileText className="w-4 h-4" />
                        New Work Order
                    </motion.button>
                </div>
            </div>

            {(() => {
                const q = searchQuery.toLowerCase();
                const filtered = workOrders.filter(order => {
                    return !q ||
                        order.workOrderNumber?.toLowerCase().includes(q) ||
                        order.addressLocation?.toLowerCase().includes(q) ||
                        order.storeKeeperSupervisorName?.toLowerCase().includes(q) ||
                        order.createdBy?.fullName?.toLowerCase().includes(q) ||
                        order.taskReference?.toLowerCase().includes(q);
                });

                if (filtered.length === 0) {
                    return <div className="text-center py-8 text-muted-foreground glass-card rounded-xl">No work orders match your search.</div>;
                }

                return filtered.map((order) => (
                    <motion.div
                        key={order._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card overflow-hidden"
                    >
                        <button
                            onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-medium text-foreground">WO #{order.workOrderNumber}</h4>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm:ss') : format(new Date(order.date), 'dd/MM/yyyy')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Export buttons - shown when expanded */}
                                {expandedId === order._id && (
                                    <div className="flex items-center gap-2 mr-2" onClick={(e) => e.stopPropagation()}>
                                        {isAdmin && onEdit && (
                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit(order);
                                                }}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 transition-colors"
                                                title="Edit Work Order"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">Edit</span>
                                            </motion.button>
                                        )}

                                        {isAdmin && onDelete && (
                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(order);
                                                }}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors"
                                                title="Delete Work Order"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">Delete</span>
                                            </motion.button>
                                        )}

                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            onClick={(e) => handleExport('pdf', order, e)}
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
                                            onClick={(e) => handleExport('xlsx', order, e)}
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
                                            onClick={(e) => handleExport('csv', order, e)}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                                            title="Export as CSV"
                                        >
                                            <File className="w-3.5 h-3.5" />
                                            <span className="text-xs font-medium">CSV</span>
                                        </motion.button>

                                        {/* Upload PDF Button */}
                                        {uploadingId === order._id ? (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-muted-foreground ml-2">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span className="text-xs">Uploading…</span>
                                            </div>
                                        ) : order.uploadedPdf ? (
                                            <>
                                                <motion.button
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    onClick={(e) => { e.stopPropagation(); handleViewPdf(order); }}
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
                                                        onClick={(e) => { e.stopPropagation(); handleRemovePdf(order); }}
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
                                                transition={{ delay: 0.2 }}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 transition-colors ml-2 border border-sky-500/20 cursor-pointer"
                                                title="Upload PDF for this Work Order"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">Upload PDF</span>
                                                <input
                                                    type="file"
                                                    accept="application/pdf,.pdf,.doc,.docx,image/*"
                                                    className="hidden"
                                                    onChange={(e) => handlePdfUpload(order, e.target.files[0])}
                                                />
                                            </motion.label>
                                        )}

                                        {/* Create Certification Button */}
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.15 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onCreateCertification) {
                                                    onCreateCertification(order);
                                                } else {
                                                    navigate('/certification', { state: { sourceWorkOrder: order } });
                                                }
                                            }}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 transition-colors ml-2 border border-orange-500/20"
                                            title="Create Certification from this Work Order"
                                        >
                                            <ClipboardCheck className="w-3.5 h-3.5" />
                                            <span className="text-xs font-medium">Create Certification</span>
                                        </motion.button>
                                    </div>
                                )}
                                <motion.div
                                    animate={{ rotate: expandedId === order._id ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                </motion.div>
                            </div>
                        </button>

                        <AnimatePresence>
                            {expandedId === order._id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-white/10"
                                >
                                    <div className="p-6 space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Address/Location</p>
                                                <p className="font-medium">{order.addressLocation}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Main Reference</p>
                                                <p className="font-medium">{order.mainWorkOrderReference || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Task No</p>
                                                <p className="font-medium">{order.taskReference || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Supervisor</p>
                                                <p className="font-medium">{order.storeKeeperSupervisorName || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Created By</p>
                                                <p className="font-medium">{order.createdBy?.fullName || 'Unknown'}</p>
                                            </div>
                                        </div>

                                        {order.workItems && order.workItems.length > 0 && (
                                            <div className="mt-6">
                                                <h4 className="font-semibold mb-3">Work Items</h4>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-white/10">
                                                                <th className="text-left p-2 text-muted-foreground font-medium">Description</th>
                                                                <th className="text-left p-2 text-muted-foreground font-medium">Labour</th>
                                                                <th className="text-left p-2 text-muted-foreground font-medium">Start Date</th>
                                                                <th className="text-left p-2 text-muted-foreground font-medium">End Date</th>
                                                                <th className="text-left p-2 text-muted-foreground font-medium">Area</th>
                                                                <th className="text-left p-2 text-muted-foreground font-medium">Rate</th>
                                                                <th className="text-left p-2 text-muted-foreground font-medium">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {order.workItems.map((item, idx) => (
                                                                <tr key={idx} className="border-b border-white/5">
                                                                    <td className="p-2">{item.workDescription}</td>
                                                                    <td className="p-2">{item.plannedLabour}</td>
                                                                    <td className="p-2">{format(new Date(item.workStartDate), 'dd/MM/yyyy')}</td>
                                                                    <td className="p-2">{format(new Date(item.workFinishDate), 'dd/MM/yyyy')}</td>
                                                                    <td className="p-2">{item.workArea}</td>
                                                                    <td className="p-2">₹{item.rate}</td>
                                                                    <td className="p-2 font-semibold">₹{item.totalAmount}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {(order.signatures?.contractor || order.signatures?.engineer || order.signatures?.supervisor) && (
                                            <div className="mt-6">
                                                <h4 className="font-semibold mb-3">Signatures</h4>
                                                <div className="grid md:grid-cols-3 gap-4">
                                                    {order.signatures.contractor && (
                                                        <div>
                                                            <p className="text-sm text-muted-foreground mb-2">Contractor</p>
                                                            <img src={order.signatures.contractor} alt="Contractor Signature" className="border border-white/10 rounded-lg bg-white p-2" />
                                                        </div>
                                                    )}
                                                    {order.signatures.engineer && (
                                                        <div>
                                                            <p className="text-sm text-muted-foreground mb-2">Engineer</p>
                                                            <img src={order.signatures.engineer} alt="Engineer Signature" className="border border-white/10 rounded-lg bg-white p-2" />
                                                        </div>
                                                    )}
                                                    {order.signatures.supervisor && (
                                                        <div>
                                                            <p className="text-sm text-muted-foreground mb-2">Supervisor</p>
                                                            <img src={order.signatures.supervisor} alt="Supervisor Signature" className="border border-white/10 rounded-lg bg-white p-2" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ));
            })()}

            {/* Load More Pagination */}
            {hasMore && onLoadMore && (
                <div className="p-4 flex justify-center mt-4">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="bg-white/5 border border-white/10 hover:bg-white/10 min-w-[150px] px-4 py-2 rounded-xl transition-all flex justify-center items-center"
                    >
                        {isLoadingMore ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                Loading...
                            </span>
                        ) : (
                            'Load More Work Orders'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default WorkOrdersList;
