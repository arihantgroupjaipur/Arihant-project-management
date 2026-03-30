import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    ShoppingCart,
    ShieldCheck,
    HardHat,
    Truck,
    ClipboardCheck,
    ClipboardList,
    Sheet,
    File,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { generateTaskPDF } from "@/utils/taskPdfExport";
import { generateIndentPDF, } from "@/utils/indentPdfExport";
import { generateIndentCSV } from "@/utils/indentCsvExport";
import { generateIndentExcel } from "@/utils/indentExcelExport";
import { generatePurchaseOrderPDF } from "@/utils/purchaseOrderPdfExport";
import { generatePurchaseOrderCSV } from "@/utils/purchaseOrderCsvExport";
import { generatePurchaseOrderExcel } from "@/utils/purchaseOrderExcelExport";
import { generateMaterialVerificationPdf } from "@/utils/materialVerificationPdfExport";
import { exportMaterialVerificationCsv } from "@/utils/materialVerificationCsvExport";
import { exportMaterialVerificationXlsx } from "@/utils/materialVerificationXlsxExport";
import { generatePDF as generateEntriesPDF } from "@/utils/pdfExport";
import { generateCSV as generateEntriesCSV } from "@/utils/csvExport";
import { generateExcel as generateEntriesExcel } from "@/utils/excelExport";



// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return "—";
    const day = String(dt.getDate()).padStart(2, '0');
    const mon = String(dt.getMonth() + 1).padStart(2, '0');
    const yr = dt.getFullYear();
    const hh = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    const ss = String(dt.getSeconds()).padStart(2, '0');
    return `${day}/${mon}/${yr} ${hh}:${min}:${ss}`;
};

const StatusChip = ({ status }) => {
    const map = {
        "Completed": "bg-green-500/10 text-green-400 border-green-500/20",
        "In Progress": "bg-blue-500/10 text-blue-400 border-blue-500/20",
        "Pending": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        "Delayed": "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded border ${map[status] || map["Pending"]}`}>{status || "Pending"}</span>;
};

const SectionHeader = ({ icon: Icon, title, count, color = "text-foreground" }) => (
    <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <h4 className={`text-sm font-semibold ${color}`}>{title}</h4>
        {count !== undefined && <span className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded-full text-muted-foreground">{count}</span>}
    </div>
);

const InfoRow = ({ label, value, mono = false }) => (
    <div className="flex justify-between items-start gap-3 py-1.5 border-b border-white/5 last:border-0">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <span className={`text-xs text-right ${mono ? "font-mono text-primary" : "text-foreground"}`}>{value ?? "—"}</span>
    </div>
);

const StageStep = ({ icon: Icon, label, done, active }) => (
    <div className={`flex flex-col items-center gap-1.5 ${!done && !active ? "opacity-35" : ""}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${done ? "border-green-400 bg-green-400/10" : active ? "border-primary bg-primary/10 animate-pulse" : "border-white/15 bg-white/5"}`}>
            {done ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />}
        </div>
        <span className="text-[10px] text-center text-muted-foreground leading-tight max-w-14">{label}</span>
    </div>
);

const Connector = ({ done }) => <div className={`flex-1 h-0.5 mb-5 rounded-full ${done ? "bg-green-400/50" : "bg-white/10"}`} />;

// ─── Quick-view section lists ─────────────────────────────────────────────────
const TaskList = ({ tasks }) => (
    <div className="border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
            <thead className="bg-white/5 text-muted-foreground text-xs uppercase">
                <tr>
                    <th className="p-3 text-left">Task ID</th>
                    <th className="p-3 text-left">Work Particulars</th>
                    <th className="p-3 text-left">Start</th>
                    <th className="p-3 text-left">Finish</th>
                    <th className="p-3 text-left">Duration</th>
                    <th className="p-3 text-left">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {tasks.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No tasks created yet</td></tr>
                ) : tasks.map(t => (
                    <tr key={t._id} className="hover:bg-white/5">
                        <td className="p-3 font-mono text-primary">{t.taskId || "—"}</td>
                        <td className="p-3 text-foreground">{t.workParticulars}</td>
                        <td className="p-3 text-muted-foreground">{fmt(t.plannedStartDate)}</td>
                        <td className="p-3 text-muted-foreground">{fmt(t.plannedFinishDate)}</td>
                        <td className="p-3 text-muted-foreground">{t.duration}</td>
                        <td className="p-3"><StatusChip status={t.status || "Pending"} /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const IndentList = ({ indents }) => (
    <div className="border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
            <thead className="bg-white/5 text-muted-foreground text-xs uppercase">
                <tr>
                    <th className="p-3 text-left">Indent No.</th>
                    <th className="p-3 text-left">Site</th>
                    <th className="p-3 text-left">Material Group</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Task Ref</th>
                    <th className="p-3 text-left">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {indents.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No indents found</td></tr>
                ) : indents.map(i => (
                    <tr key={i._id} className="hover:bg-white/5">
                        <td className="p-3 font-mono text-primary">{i.indentNumber}</td>
                        <td className="p-3 text-foreground">{i.siteName}</td>
                        <td className="p-3 text-muted-foreground">{i.materialGroup}</td>
                        <td className="p-3 text-muted-foreground">{fmt(i.date)}</td>
                        <td className="p-3 text-muted-foreground">{i.taskReference || "—"}</td>
                        <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded border ${i.verifiedByPurchaseManager ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"}`}>{i.verifiedByPurchaseManager ? "Verified" : "Pending"}</span></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const POList = ({ purchaseOrders }) => (
    <div className="border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
            <thead className="bg-white/5 text-muted-foreground text-xs uppercase">
                <tr>
                    <th className="p-3 text-left">PO Number</th>
                    <th className="p-3 text-left">Vendor</th>
                    <th className="p-3 text-left">Indent No.</th>
                    <th className="p-3 text-left">Task No</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-center">Items</th>
                    <th className="p-3 text-left">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {purchaseOrders.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No purchase orders found</td></tr>
                ) : purchaseOrders.map(po => (
                    <tr key={po._id} className="hover:bg-white/5">
                        <td className="p-3 font-mono text-primary">{po.poNumber || po._id}</td>
                        <td className="p-3 text-foreground">{po.vendorName || "—"}</td>
                        <td className="p-3 text-muted-foreground">{po.indentReferences?.map(i => i?.indentNumber).join(', ') || "—"}</td>
                        <td className="p-3 text-muted-foreground">{po.taskReference || "—"}</td>
                        <td className="p-3 text-muted-foreground">{fmt(po.poDate || po.createdAt)}</td>
                        <td className="p-3 text-center text-orange-400 font-bold">{po.items?.length || 0}</td>
                        <td className="p-3"><StatusChip status={po.status || "Pending"} /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const MaterialVerList = ({ purchaseOrders }) => {
    const pos = purchaseOrders.filter(po => po.items?.some(item => item.receivedQuantity > 0 || item.verified));
    return (
        <div className="border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-white/5 text-muted-foreground text-xs uppercase">
                    <tr>
                        <th className="p-3 text-left">PO Number</th>
                        <th className="p-3 text-left">Vendor</th>
                        <th className="p-3 text-left">Indent No.</th>
                        <th className="p-3 text-left">Task No</th>
                        <th className="p-3 text-center">Items Ordered</th>
                        <th className="p-3 text-left">Verification</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {purchaseOrders.length === 0 ? (
                        <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No material verifications found</td></tr>
                    ) : purchaseOrders.map(po => {
                        const verified = po.items?.filter(i => Number(i.receivedQuantity) > 0).length || 0;
                        const total = po.items?.length || 0;
                        return (
                            <tr key={po._id} className="hover:bg-white/5">
                                <td className="p-3 font-mono text-primary">{po.poNumber || po._id}</td>
                                <td className="p-3 text-foreground">{po.vendorName || "—"}</td>
                                <td className="p-3 text-muted-foreground">{po.indentReferences?.map(i => i?.indentNumber).join(', ') || "—"}</td>
                                <td className="p-3 text-muted-foreground">{po.taskReference || "—"}</td>
                                <td className="p-3 text-center text-foreground">{total}</td>
                                <td className="p-3">
                                    <span className={`text-xs px-2 py-0.5 rounded border ${verified === total && total > 0 ? "text-green-400 bg-green-500/10 border-green-500/20" : verified > 0 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" : "text-muted-foreground bg-white/5 border-white/10"}`}>
                                        {verified}/{total} items received
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const WorkOrderList = ({ workOrders, workCompletions }) => (
    <div className="border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
            <thead className="bg-white/5 text-muted-foreground text-xs uppercase">
                <tr>
                    <th className="p-3 text-left">WO Number</th>
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-left">Location</th>
                    <th className="p-3 text-left">Task Ref</th>
                    <th className="p-3 text-center">Planned Labour</th>
                    <th className="p-3 text-left">QA/QC</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {workOrders.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No work orders found</td></tr>
                ) : workOrders.map(wo => {
                    const completed = workCompletions.some(wc => wc.workOrderNumber === wo.workOrderNumber);
                    const labour = wo.workItems?.reduce((s, wi) => s + (Number(wi.plannedLabour) || 0), 0) || 0;
                    return (
                        <tr key={wo._id} className="hover:bg-white/5">
                            <td className="p-3 font-mono text-primary">{wo.workOrderNumber}</td>
                            <td className="p-3 text-foreground">{wo.workItems?.[0]?.workDescription || wo.workDescription || "—"}</td>
                            <td className="p-3 text-muted-foreground">{wo.workLocationName}</td>
                            <td className="p-3 text-muted-foreground">{wo.taskReference || "—"}</td>
                            <td className="p-3 text-center text-cyan-400 font-bold">{labour}</td>
                            <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded border ${completed ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"}`}>{completed ? "✓ Done" : "Pending"}</span></td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

const DeploymentList = ({ entries }) => (
    <div className="border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
            <thead className="bg-white/5 text-muted-foreground text-xs uppercase">
                <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Site / WO</th>
                    <th className="p-3 text-left">Location</th>
                    <th className="p-3 text-left">Work Names</th>
                    <th className="p-3 text-center">Workers</th>
                    <th className="p-3 text-left">Supervisor</th>
                    <th className="p-3 text-center">Materials</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {entries.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No deployment entries found</td></tr>
                ) : entries.map(e => {
                    const workNames = [...new Set((e.dailyProgressReports || []).map(r => r.workName).filter(Boolean))];
                    return (
                        <tr key={e._id} className="hover:bg-white/5">
                            <td className="p-3 text-muted-foreground">{e.date}</td>
                            <td className="p-3 text-foreground font-medium">{e.projectName}</td>
                            <td className="p-3 text-muted-foreground">{e.location}</td>
                            <td className="p-3 text-foreground text-xs">
                                {workNames.length > 0 ? workNames.join(', ') : '—'}
                            </td>
                            <td className="p-3 text-center font-bold text-cyan-400">{e.workerCount}</td>
                            <td className="p-3 text-foreground">{e.supervisor}</td>
                            <td className="p-3 text-center text-orange-400 font-bold">{e.materialConsumption?.length || 0}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

const CompletionList = ({ workCompletions }) => (
    <div className="border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
            <thead className="bg-white/5 text-muted-foreground text-xs uppercase">
                <tr>
                    <th className="p-3 text-left">Work Order</th>
                    <th className="p-3 text-left">Contractor</th>
                    <th className="p-3 text-left">Block/Tower</th>
                    <th className="p-3 text-left">Work Trade</th>
                    <th className="p-3 text-left">Completion Date</th>
                    <th className="p-3 text-left">QC Remarks</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {workCompletions.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No work completions found</td></tr>
                ) : workCompletions.map(wc => (
                    <tr key={wc._id} className="hover:bg-white/5">
                        <td className="p-3 font-mono text-primary">{wc.workOrderNumber}</td>
                        <td className="p-3 text-foreground">{wc.contractorName}</td>
                        <td className="p-3 text-muted-foreground">{wc.blockTower}</td>
                        <td className="p-3 text-muted-foreground">{wc.workTrade}</td>
                        <td className="p-3 text-green-400">{fmt(wc.date || wc.createdAt)}</td>
                        <td className="p-3 text-muted-foreground text-xs">{wc.qcRemarks || "—"}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// ─── Quick Button Config ──────────────────────────────────────────────────────
const QUICK_SECTIONS = [
    { key: "tasks", label: "Tasks", icon: ClipboardList, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
    { key: "indents", label: "Indents", icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
    { key: "po", label: "Purchase Orders", icon: ShoppingCart, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
    { key: "mv", label: "Material Verification", icon: ShieldCheck, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/30" },
    { key: "workorders", label: "Work Orders", icon: HardHat, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
    { key: "deployments", label: "Daily Progress Reports", icon: Truck, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
    { key: "completions", label: "Work Completions", icon: ClipboardCheck, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
];


// ─── Bulk export helpers for work orders & completions ───────────────────────
const bulkExportWorkOrdersCSV = (workOrders) => {
    if (!workOrders.length) { toast.error("No work orders to export"); return; }
    const headers = ["WO Number", "Date", "Task No", "Location", "Supervisor", "Planned Labour", "Total Amount"];
    const rows = workOrders.map(wo => [
        wo.workOrderNumber,
        wo.date ? new Date(wo.date).toLocaleDateString('en-GB') : '',
        wo.taskReference || '',
        wo.workLocationName || '',
        wo.storeKeeperSupervisorName || '',
        wo.workItems?.reduce((s, i) => s + (Number(i.plannedLabour) || 0), 0) || 0,
        wo.workItems?.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0) || 0,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Work_Orders_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
};

const bulkExportWorkOrdersExcel = async (workOrders) => {
    if (!workOrders.length) { toast.error("No work orders to export"); return; }
    const XLSX = await import('xlsx');
    const rows = workOrders.map(wo => ({
        "WO Number": wo.workOrderNumber,
        "Date": wo.date ? new Date(wo.date).toLocaleDateString('en-GB') : '',
        "Task No": wo.taskReference || '',
        "Location": wo.workLocationName || '',
        "Supervisor": wo.storeKeeperSupervisorName || '',
        "Planned Labour": wo.workItems?.reduce((s, i) => s + (Number(i.plannedLabour) || 0), 0) || 0,
        "Total Amount": wo.workItems?.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0) || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Work Orders");
    XLSX.writeFile(wb, `Work_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const bulkExportCompletionsCSV = (workCompletions) => {
    if (!workCompletions.length) { toast.error("No completions to export"); return; }
    const headers = ["Work Order", "Contractor", "Block/Tower", "Work Trade", "Date", "QC Remarks"];
    const rows = workCompletions.map(wc => [
        wc.workOrderNumber, wc.contractorName || '', wc.blockTower || '',
        wc.workTrade || '', wc.date ? new Date(wc.date).toLocaleDateString('en-GB') : '', wc.qcRemarks || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Work_Completions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
};

const bulkExportCompletionsExcel = async (workCompletions) => {
    if (!workCompletions.length) { toast.error("No completions to export"); return; }
    const XLSX = await import('xlsx');
    const rows = workCompletions.map(wc => ({
        "Work Order": wc.workOrderNumber,
        "Contractor": wc.contractorName || '',
        "Block/Tower": wc.blockTower || '',
        "Work Trade": wc.workTrade || '',
        "Date": wc.date ? new Date(wc.date).toLocaleDateString('en-GB') : '',
        "QC Remarks": wc.qcRemarks || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Work Completions");
    XLSX.writeFile(wb, `Work_Completions_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const bulkExportTasksCSV = (tasks) => {
    if (!tasks.length) { toast.error("No tasks to export"); return; }
    const headers = ["Task ID", "Work Particulars", "Start Date", "Finish Date", "Duration", "Status"];
    const rows = tasks.map(t => [
        t.taskId || '', t.workParticulars || '',
        t.plannedStartDate ? new Date(t.plannedStartDate).toLocaleDateString('en-GB') : '',
        t.plannedFinishDate ? new Date(t.plannedFinishDate).toLocaleDateString('en-GB') : '',
        t.duration || '', t.status || 'Pending',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Tasks_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
};

const bulkExportTasksExcel = async (tasks) => {
    if (!tasks.length) { toast.error("No tasks to export"); return; }
    const XLSX = await import('xlsx');
    const rows = tasks.map(t => ({
        "Task ID": t.taskId || '',
        "Work Particulars": t.workParticulars || '',
        "Start Date": t.plannedStartDate ? new Date(t.plannedStartDate).toLocaleDateString('en-GB') : '',
        "Finish Date": t.plannedFinishDate ? new Date(t.plannedFinishDate).toLocaleDateString('en-GB') : '',
        "Duration": t.duration || '',
        "Status": t.status || 'Pending',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, `Tasks_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MasterTracking = ({
    tasks = [],
    indents = [],
    purchaseOrders = [],
    workOrders = [],
    entries = [],
    workCompletions = [],
}) => {
    const [activeSection, setActiveSection] = useState("tasks");

    const handleExport = async (type) => {
        try {
            if (activeSection === "tasks") {
                if (type === "pdf") await generateTaskPDF(tasks);
                else if (type === "csv") bulkExportTasksCSV(tasks);
                else if (type === "xlsx") await bulkExportTasksExcel(tasks);
            } else if (activeSection === "indents") {
                if (type === "pdf") await generateIndentPDF(indents);
                else if (type === "csv") generateIndentCSV(indents);
                else if (type === "xlsx") generateIndentExcel(indents);
            } else if (activeSection === "po") {
                if (type === "pdf") await generatePurchaseOrderPDF(purchaseOrders);
                else if (type === "csv") generatePurchaseOrderCSV(purchaseOrders);
                else if (type === "xlsx") generatePurchaseOrderExcel(purchaseOrders);
            } else if (activeSection === "mv") {
                if (type === "pdf") await generateMaterialVerificationPdf(purchaseOrders);
                else if (type === "csv") exportMaterialVerificationCsv(purchaseOrders);
                else if (type === "xlsx") exportMaterialVerificationXlsx(purchaseOrders);
            } else if (activeSection === "workorders") {
                if (type === "csv") bulkExportWorkOrdersCSV(workOrders);
                else if (type === "xlsx") await bulkExportWorkOrdersExcel(workOrders);
                else toast.error("Use individual Work Order cards for PDF export");
            } else if (activeSection === "deployments") {
                if (type === "pdf") await generateEntriesPDF(entries);
                else if (type === "csv") generateEntriesCSV(entries);
                else if (type === "xlsx") generateEntriesExcel(entries);
            } else if (activeSection === "completions") {
                if (type === "csv") bulkExportCompletionsCSV(workCompletions);
                else if (type === "xlsx") await bulkExportCompletionsExcel(workCompletions);
                else toast.error("Use individual Certification cards for PDF export");
            }
            toast.success(`${type.toUpperCase()} exported successfully!`);
        } catch (err) {
            console.error("Export error:", err);
            toast.error(`Failed to export ${type.toUpperCase()}`);
        }
    };




    // Count badge per section
    const counts = {
        tasks: tasks.length,
        indents: indents.length,
        po: purchaseOrders.length,
        mv: purchaseOrders.length,
        workorders: workOrders.length,
        deployments: entries.length,
        completions: workCompletions.length,
    };

    return (
        <div className="space-y-5">

            {/* ── Quick Section Buttons ─────────────────────────────────────── */}
            <div className="glass-card p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Access</p>
                <div className="flex flex-wrap gap-2">
                    {QUICK_SECTIONS.map(s => {
                        const Icon = s.icon;
                        const active = activeSection === s.key;
                        return (
                            <button
                                key={s.key}
                                onClick={() => setActiveSection(s.key)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${active
                                    ? `${s.bg} ${s.color}`
                                    : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10"
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {s.label}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-white/10"}`}>
                                    {counts[s.key]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Section: Quick lists ─────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {activeSection !== "tracker" && (
                    <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-5">
                        {(() => {
                            const s = QUICK_SECTIONS.find(s => s.key === activeSection);
                            const Icon = s.icon;
                            return (
                                <>
                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                        <Icon className={`w-5 h-5 ${s.color}`} />
                                        <h3 className="text-base font-semibold text-foreground">{s.label}</h3>
                                        <span className="text-xs text-muted-foreground">{counts[activeSection]} records</span>
                                        <div className="ml-auto flex items-center gap-2">
                                            {activeSection !== "workorders" && activeSection !== "completions" && (
                                                <button
                                                    onClick={() => handleExport("pdf")}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors"
                                                    title="Export as PDF"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    PDF
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleExport("xlsx")}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium transition-colors"
                                                title="Export as Excel"
                                            >
                                                <Sheet className="w-3.5 h-3.5" />
                                                Excel
                                            </button>
                                            <button
                                                onClick={() => handleExport("csv")}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium transition-colors"
                                                title="Export as CSV"
                                            >
                                                <File className="w-3.5 h-3.5" />
                                                CSV
                                            </button>
                                        </div>
                                    </div>
                                    {activeSection === "tasks" && <TaskList tasks={tasks} />}
                                    {activeSection === "indents" && <IndentList indents={indents} />}
                                    {activeSection === "po" && <POList purchaseOrders={purchaseOrders} />}
                                    {activeSection === "mv" && <MaterialVerList purchaseOrders={purchaseOrders} />}
                                    {activeSection === "workorders" && <WorkOrderList workOrders={workOrders} workCompletions={workCompletions} />}
                                    {activeSection === "deployments" && <DeploymentList entries={entries} />}
                                    {activeSection === "completions" && <CompletionList workCompletions={workCompletions} />}
                                </>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};


export default MasterTracking;
