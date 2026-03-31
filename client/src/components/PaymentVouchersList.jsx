import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, FileText, Download, Trash, Sheet } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import paymentVoucherService from "@/services/paymentVoucherService";
import FloatingInput from "@/components/FloatingInput";
import { generatePaymentVoucherPDF } from "@/utils/paymentVoucherPdfExport";
import { exportSingleVoucherExcel, exportAllVouchersExcel } from "@/utils/paymentVoucherExcelExport";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_COLORS = {
    Draft:    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    Approved: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Paid:     "bg-green-500/10 text-green-400 border-green-500/20",
};

const EMPTY_ITEM = { description: "", unit: "", qty: "", rate: "" };

const EMPTY_FORM = {
    voucherNumber: "", partyName: "", siteName: "", date: "",
    gstPercentage: "", paymentTerms: "",
    preparedBy: "", authorisedBy: "", accountsOfficer: "",
    status: "Draft", remarks: "",
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

const computeTotals = (items, gstPct) => {
    const sub = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
    const gst = +(sub * (Number(gstPct) || 0) / 100).toFixed(2);
    return { sub, gst, total: +(sub + gst).toFixed(2) };
};

const fmtInr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const PaymentVouchersList = ({ isAdmin = false }) => {
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["payment-vouchers", page],
        queryFn: () => paymentVoucherService.getAll(page),
    });

    const vouchers = data?.vouchers || [];
    const hasMore  = data?.hasMore  || false;

    const deleteMutation = useMutation({
        mutationFn: (id) => paymentVoucherService.delete(id),
        onSuccess: () => {
            toast.success("Voucher deleted");
            queryClient.invalidateQueries({ queryKey: ["payment-vouchers"] });
        },
        onError: () => toast.error("Failed to delete voucher"),
    });

    const openCreate = () => {
        setEditingVoucher(null);
        setForm(EMPTY_FORM);
        setItems([{ ...EMPTY_ITEM }]);
        setShowForm(true);
    };

    const openEdit = (v) => {
        setEditingVoucher(v);
        setForm({
            voucherNumber: v.voucherNumber ?? "",
            partyName: v.partyName, siteName: v.siteName, date: v.date,
            gstPercentage: v.gstPercentage ?? "", paymentTerms: v.paymentTerms ?? "",
            preparedBy: v.preparedBy ?? "", authorisedBy: v.authorisedBy ?? "",
            accountsOfficer: v.accountsOfficer ?? "", status: v.status,
            remarks: v.remarks ?? "",
        });
        setItems(v.items?.length ? v.items.map(it => ({ ...it })) : [{ ...EMPTY_ITEM }]);
        setShowForm(true);
    };

    // ── Item helpers ──────────────────────────────────────────────────────────
    const setItem = (i, field, val) =>
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
    const addItem    = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

    const { sub, gst, total } = computeTotals(items, form.gstPercentage);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.partyName || !form.date) { toast.error("Party name and date are required"); return; }
        setIsSubmitting(true);
        try {
            const payload = { ...form, items };
            if (editingVoucher) {
                await paymentVoucherService.update(editingVoucher._id, payload);
                toast.success("Voucher updated");
            } else {
                await paymentVoucherService.create(payload);
                toast.success("Voucher created");
            }
            queryClient.invalidateQueries({ queryKey: ["payment-vouchers"] });
            setShowForm(false);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save voucher");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-foreground">Payment Vouchers</h3>
                    <p className="text-muted-foreground text-sm">Create and manage payment vouchers</p>
                </div>
                <div className="flex items-center gap-2">
                    {vouchers.length > 0 && (
                        <motion.button whileTap={{ scale: 0.97 }}
                            onClick={() => exportAllVouchersExcel(vouchers).catch(() => toast.error("Export failed"))}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all font-medium text-sm border border-emerald-500/20">
                            <Sheet className="w-4 h-4" /> Export All
                        </motion.button>
                    )}
                    <motion.button whileTap={{ scale: 0.97 }} onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all font-medium text-sm">
                        <Plus className="w-4 h-4" /> Create Voucher
                    </motion.button>
                </div>
            </div>

            {/* ── Form Modal ────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="glass-card w-full max-w-3xl p-6 space-y-5 relative max-h-[92vh] overflow-y-auto">

                            <div className="flex items-center justify-between">
                                <h4 className="text-lg font-semibold text-foreground">
                                    {editingVoucher ? "Edit Payment Voucher" : "Create Payment Voucher"}
                                </h4>
                                <button onClick={() => setShowForm(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* ── Basic fields ── */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FloatingInput label="Voucher No. (optional)" type="text"
                                        value={form.voucherNumber}
                                        onChange={e => setForm(p => ({ ...p, voucherNumber: e.target.value }))} />
                                    <FloatingInput label="Party / Contractor Name *" type="text"
                                        value={form.partyName}
                                        onChange={e => setForm(p => ({ ...p, partyName: e.target.value }))} />
                                    <FloatingInput label="Site Name" type="text"
                                        value={form.siteName}
                                        onChange={e => setForm(p => ({ ...p, siteName: e.target.value }))} />
                                    <FloatingInput label="Date *" type="date"
                                        value={form.date}
                                        onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                                    <FloatingInput label="GST %" type="number"
                                        value={form.gstPercentage}
                                        onChange={e => setForm(p => ({ ...p, gstPercentage: e.target.value }))} />
                                    <FloatingInput label="Payment Terms" type="text"
                                        value={form.paymentTerms}
                                        onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))} />
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                                        <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                                            <SelectTrigger className="h-11 bg-white/5 border-white/10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {["Draft", "Approved", "Paid"].map(s => (
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* ── Items table ── */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Items</label>
                                    <div className="overflow-x-auto rounded-xl border border-white/10">
                                        <table className="w-full text-sm min-w-[560px]">
                                            <thead className="bg-white/5 text-muted-foreground text-xs uppercase">
                                                <tr>
                                                    <th className="p-2 text-left w-8">#</th>
                                                    <th className="p-2 text-left">Description</th>
                                                    <th className="p-2 text-center w-20">Unit</th>
                                                    <th className="p-2 text-center w-20">Qty.</th>
                                                    <th className="p-2 text-right w-24">Rate (₹)</th>
                                                    <th className="p-2 text-right w-28">Amount (₹)</th>
                                                    <th className="p-2 w-8"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/10">
                                                {items.map((it, i) => {
                                                    const amt = (Number(it.qty) || 0) * (Number(it.rate) || 0);
                                                    return (
                                                        <tr key={i}>
                                                            <td className="p-2 text-center text-muted-foreground text-xs">{i + 1}</td>
                                                            <td className="p-1.5">
                                                                <input value={it.description}
                                                                    onChange={e => setItem(i, 'description', e.target.value)}
                                                                    placeholder="Description"
                                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                                            </td>
                                                            <td className="p-1.5">
                                                                <input value={it.unit}
                                                                    onChange={e => setItem(i, 'unit', e.target.value)}
                                                                    placeholder="Sqft"
                                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                                            </td>
                                                            <td className="p-1.5">
                                                                <input value={it.qty} type="number"
                                                                    onChange={e => setItem(i, 'qty', e.target.value)}
                                                                    placeholder="0"
                                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                                            </td>
                                                            <td className="p-1.5">
                                                                <input value={it.rate} type="number"
                                                                    onChange={e => setItem(i, 'rate', e.target.value)}
                                                                    placeholder="0.00"
                                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                                            </td>
                                                            <td className="p-2 text-right text-sm font-medium text-green-400 whitespace-nowrap">
                                                                {amt > 0 ? fmtInr(amt) : "—"}
                                                            </td>
                                                            <td className="p-1.5 text-center">
                                                                {items.length > 1 && (
                                                                    <button type="button" onClick={() => removeItem(i)}
                                                                        className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors">
                                                                        <Trash className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <button type="button" onClick={addItem}
                                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                                        <Plus className="w-3.5 h-3.5" /> Add Row
                                    </button>

                                    {/* Totals */}
                                    <div className="flex flex-col items-end gap-1 pt-2 pr-1 text-sm">
                                        <div className="flex gap-6 text-muted-foreground">
                                            <span>Sub Total</span>
                                            <span className="font-medium text-foreground w-32 text-right">{fmtInr(sub)}</span>
                                        </div>
                                        {Number(form.gstPercentage) > 0 && (
                                            <div className="flex gap-6 text-muted-foreground">
                                                <span>GST {form.gstPercentage}%</span>
                                                <span className="font-medium text-foreground w-32 text-right">{fmtInr(gst)}</span>
                                            </div>
                                        )}
                                        <div className="flex gap-6 font-bold text-foreground border-t border-white/10 pt-1">
                                            <span>Total Amount</span>
                                            <span className="text-green-400 w-32 text-right">{fmtInr(total)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Signature fields ── */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <FloatingInput label="Prepared By" type="text"
                                        value={form.preparedBy}
                                        onChange={e => setForm(p => ({ ...p, preparedBy: e.target.value }))} />
                                    <FloatingInput label="Authorised By" type="text"
                                        value={form.authorisedBy}
                                        onChange={e => setForm(p => ({ ...p, authorisedBy: e.target.value }))} />
                                    <FloatingInput label="Accounts Officer" type="text"
                                        value={form.accountsOfficer}
                                        onChange={e => setForm(p => ({ ...p, accountsOfficer: e.target.value }))} />
                                </div>

                                <FloatingInput label="Remarks" type="text"
                                    value={form.remarks}
                                    onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />

                                <motion.button type="submit" disabled={isSubmitting} whileTap={{ scale: 0.98 }}
                                    className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60">
                                    {isSubmitting
                                        ? (editingVoucher ? "Updating…" : "Creating…")
                                        : (editingVoucher ? "Update Voucher" : "Create Voucher")}
                                </motion.button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Table ─────────────────────────────────────────────────────── */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[800px]">
                        <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                            <tr>
                                <th className="p-4">Voucher No.</th>
                                <th className="p-4">Party Name</th>
                                <th className="p-4">Site</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Payment Terms</th>
                                <th className="p-4">Created At</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {isLoading ? (
                                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
                            ) : vouchers.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                            <p className="text-muted-foreground">No vouchers yet. Create the first one.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : vouchers.map((v) => {
                                const { total } = computeTotals(v.items || [], v.gstPercentage);
                                return (
                                    <motion.tr key={v._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-mono text-primary font-semibold">{v.voucherNumber}</td>
                                        <td className="p-4 font-medium text-foreground">{v.partyName}</td>
                                        <td className="p-4 text-muted-foreground">{v.siteName || "—"}</td>
                                        <td className="p-4 text-muted-foreground">{v.date || "—"}</td>
                                        <td className="p-4 text-right font-semibold text-green-400">{fmtInr(total)}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[v.status] || STATUS_COLORS.Draft}`}>
                                                {v.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-muted-foreground">{v.paymentTerms || "—"}</td>
                                        <td className="p-4 text-muted-foreground text-xs">{fmtTs(v.createdAt)}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <motion.button whileHover={{ scale: 1.05 }}
                                                    onClick={() => generatePaymentVoucherPDF(v)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors">
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">PDF</span>
                                                </motion.button>
                                                <motion.button whileHover={{ scale: 1.05 }}
                                                    onClick={() => exportSingleVoucherExcel(v).catch(() => toast.error("Export failed"))}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors">
                                                    <Sheet className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">Excel</span>
                                                </motion.button>
                                                {isAdmin && (
                                                    <>
                                                        <motion.button whileHover={{ scale: 1.05 }}
                                                            onClick={() => openEdit(v)}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            <span className="text-xs font-medium">Edit</span>
                                                        </motion.button>
                                                        <motion.button whileHover={{ scale: 1.05 }}
                                                            onClick={() => deleteMutation.mutate(v._id)}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            <span className="text-xs font-medium">Delete</span>
                                                        </motion.button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {hasMore && (
                    <div className="p-4 flex justify-center border-t border-white/10">
                        <button onClick={() => setPage(p => p + 1)}
                            className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-primary font-medium text-sm transition-all">
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentVouchersList;
