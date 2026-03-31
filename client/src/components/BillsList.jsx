import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Receipt, Paperclip, ExternalLink, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import billService from "@/services/billService";
import { uploadService } from "@/services/uploadService";
import FloatingInput from "@/components/FloatingInput";
import FileUploadSelector from "@/components/FileUploadSelector";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_COLORS = {
    Pending:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    Approved: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Paid:     "bg-green-500/10 text-green-400 border-green-500/20",
    Rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

const EMPTY_FORM = {
    contractorName: "", workOrderNumber: "", description: "",
    amount: "", date: "", status: "Pending", remarks: "",
};

const fmtTs = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return "—";
    const ist = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const dd = String(ist.getUTCDate()).padStart(2, "0");
    const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = ist.getUTCFullYear();
    const hh = String(ist.getUTCHours()).padStart(2, "0");
    const min = String(ist.getUTCMinutes()).padStart(2, "0");
    const ss = String(ist.getUTCSeconds()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
};

const BillsList = ({ isAdmin = false }) => {
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editingBill, setEditingBill] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newFiles, setNewFiles] = useState([]); // { file: File, name: string }[]
    const [existingAttachments, setExistingAttachments] = useState([]); // { key, name }[]
    const [loadingUrls, setLoadingUrls] = useState({});
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["bills", page],
        queryFn: () => billService.getAll(page),
    });

    const bills = data?.bills || [];
    const hasMore = data?.hasMore || false;

    const deleteMutation = useMutation({
        mutationFn: (id) => billService.delete(id),
        onSuccess: () => {
            toast.success("Bill deleted");
            queryClient.invalidateQueries({ queryKey: ["bills"] });
        },
        onError: () => toast.error("Failed to delete bill"),
    });

    const openCreate = () => {
        setEditingBill(null);
        setForm(EMPTY_FORM);
        setNewFiles([]);
        setExistingAttachments([]);
        setShowForm(true);
    };

    const openEdit = (bill) => {
        setEditingBill(bill);
        setForm({
            contractorName: bill.contractorName,
            workOrderNumber: bill.workOrderNumber,
            description: bill.description,
            amount: bill.amount,
            date: bill.date,
            status: bill.status,
            remarks: bill.remarks,
        });
        setNewFiles([]);
        setExistingAttachments(bill.attachments || []);
        setShowForm(true);
    };

    const handleFileSelect = (file) => {
        setNewFiles(prev => [...prev, { file, name: file.name }]);
    };

    const removeNewFile = (index) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingAttachment = (index) => {
        setExistingAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleViewAttachment = async (key) => {
        setLoadingUrls(prev => ({ ...prev, [key]: true }));
        try {
            const url = await uploadService.getSignedUrl(key);
            window.open(url, "_blank");
        } catch {
            toast.error("Failed to open file");
        } finally {
            setLoadingUrls(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.contractorName || !form.date) {
            toast.error("Contractor name and date are required");
            return;
        }
        setIsSubmitting(true);
        try {
            // Upload new files
            const uploadedAttachments = [];
            for (const { file, name } of newFiles) {
                toast.info(`Uploading ${name}…`);
                const result = await uploadService.uploadImage(file);
                uploadedAttachments.push({ key: result.key, name });
            }

            const attachments = [...existingAttachments, ...uploadedAttachments];

            if (editingBill) {
                await billService.update(editingBill._id, { ...form, attachments });
                toast.success("Bill updated successfully");
            } else {
                await billService.create({ ...form, attachments });
                toast.success("Bill created successfully");
            }
            queryClient.invalidateQueries({ queryKey: ["bills"] });
            setShowForm(false);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save bill");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-foreground">Bills</h3>
                    <p className="text-muted-foreground text-sm">Manage contractor bills and payment records</p>
                </div>
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create Bill
                </motion.button>
            </div>

            {/* Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="glass-card w-full max-w-xl p-6 space-y-5 relative max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between">
                                <h4 className="text-lg font-semibold text-foreground">
                                    {editingBill ? "Edit Bill" : "Create New Bill"}
                                </h4>
                                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FloatingInput label="Contractor Name *" type="text" value={form.contractorName} onChange={(e) => setForm(p => ({ ...p, contractorName: e.target.value }))} />
                                    <FloatingInput label="WO/PO Number" type="text" value={form.workOrderNumber} onChange={(e) => setForm(p => ({ ...p, workOrderNumber: e.target.value }))} />
                                    <FloatingInput label="Date *" type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} />
                                    <FloatingInput label="Amount (₹)" type="number" value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} />
                                </div>
                                <FloatingInput label="Description" type="text" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                                    <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                                        <SelectTrigger className="h-11 bg-white/5 border-white/10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["Pending", "Approved", "Paid", "Rejected"].map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <FloatingInput label="Remarks" type="text" value={form.remarks} onChange={(e) => setForm(p => ({ ...p, remarks: e.target.value }))} />

                                {/* File Attachments */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                        <Paperclip className="w-3.5 h-3.5" />
                                        Attachments (Images / PDFs)
                                    </label>

                                    {/* Existing attachments (edit mode) */}
                                    {existingAttachments.length > 0 && (
                                        <div className="space-y-1.5">
                                            {existingAttachments.map((att, i) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                                                    <span className="text-sm text-foreground flex-1 truncate">{att.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewAttachment(att.key)}
                                                        disabled={loadingUrls[att.key]}
                                                        className="p-1 hover:bg-white/10 rounded text-blue-400 transition-colors"
                                                        title="View"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExistingAttachment(i)}
                                                        className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                                        title="Remove"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* New files queued for upload */}
                                    {newFiles.length > 0 && (
                                        <div className="space-y-1.5">
                                            {newFiles.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/20">
                                                    <FileText className="w-4 h-4 text-green-400 shrink-0" />
                                                    <span className="text-sm text-foreground flex-1 truncate">{f.name}</span>
                                                    <span className="text-xs text-green-400">New</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeNewFile(i)}
                                                        className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                                        title="Remove"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <FileUploadSelector
                                        accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg"
                                        onFileSelect={handleFileSelect}
                                        title="Attach File"
                                    >
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all text-sm"
                                        >
                                            <Paperclip className="w-4 h-4" />
                                            Add Attachment
                                        </button>
                                    </FileUploadSelector>
                                </div>

                                <motion.button
                                    type="submit"
                                    disabled={isSubmitting}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60"
                                >
                                    {isSubmitting ? (editingBill ? "Updating…" : "Creating…") : (editingBill ? "Update Bill" : "Create Bill")}
                                </motion.button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[700px]">
                        <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                            <tr>
                                <th className="p-4">Bill No.</th>
                                <th className="p-4">Contractor</th>
                                <th className="p-4">WO/PO No.</th>
                                <th className="p-4">Description</th>
                                <th className="p-4 text-right">Amount</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Files</th>
                                <th className="p-4">Created At</th>
                                {isAdmin && <th className="p-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {isLoading ? (
                                <tr><td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
                            ) : bills.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 9 : 8} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                                <Receipt className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                            <p className="text-muted-foreground">No bills yet. Create the first one.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : bills.map((bill) => (
                                <motion.tr
                                    key={bill._id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hover:bg-white/5 transition-colors"
                                >
                                    <td className="p-4 font-mono text-primary font-semibold">{bill.billNumber}</td>
                                    <td className="p-4 font-medium text-foreground">{bill.contractorName}</td>
                                    <td className="p-4 text-muted-foreground">{bill.workOrderNumber || "—"}</td>
                                    <td className="p-4 text-muted-foreground max-w-[180px] truncate">{bill.description || "—"}</td>
                                    <td className="p-4 text-right font-semibold text-green-400">₹{Number(bill.amount || 0).toLocaleString('en-IN')}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[bill.status] || STATUS_COLORS.Pending}`}>
                                            {bill.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {bill.attachments?.length > 0 ? (
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {bill.attachments.map((att, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => handleViewAttachment(att.key)}
                                                        disabled={loadingUrls[att.key]}
                                                        title={att.name}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs transition-colors"
                                                    >
                                                        <FileText className="w-3 h-3" />
                                                        <span className="max-w-[80px] truncate">{att.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-muted-foreground text-xs">{fmtTs(bill.createdAt)}</td>
                                    {isAdmin && (
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    onClick={() => openEdit(bill)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">Edit</span>
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    onClick={() => deleteMutation.mutate(bill._id)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">Delete</span>
                                                </motion.button>
                                            </div>
                                        </td>
                                    )}
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {hasMore && (
                    <div className="p-4 flex justify-center border-t border-white/10">
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-primary font-medium text-sm transition-all"
                        >
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BillsList;
