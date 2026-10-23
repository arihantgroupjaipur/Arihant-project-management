import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertTriangle, TrendingUp, Users2, Loader2, Download, History, ChevronDown, Package, Gauge, Mail, Send, Clock, ShieldAlert } from "lucide-react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import { getProgressReport, getReportSites, getAnalysisHistory } from "@/services/reportService";
import { analyzeProgressReport, sendCeoReport, getCeoReportSchedule } from "@/services/aiService";
import { generateProgressAnalysisPDF } from "@/utils/progressReportPdfExport";
import settingsService from "@/services/settingsService";
import { toast } from "sonner";

// Fixed categorical identity — Planned is always blue, Actual/Used is always orange, across every chart
const COLOR_PLANNED = "#3987e5";
const COLOR_ACTUAL = "#d95926";
const AXIS_COLOR = "#898781";
const GRID_COLOR = "#2c2c2a";

// Converts a period-specific picker value into a concrete {from, to} date range for the API
const pickerValueToRange = (period, value) => {
    if (!value) return { from: undefined, to: undefined };

    if (period === 'daily') {
        return { from: value, to: value };
    }

    if (period === 'weekly') {
        // value is ISO week format "YYYY-Www" from <input type="week">
        const [yearStr, weekStr] = value.split('-W');
        const year = parseInt(yearStr, 10);
        const week = parseInt(weekStr, 10);
        const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
        const dayOfWeek = simple.getUTCDay() || 7; // Sunday(0) -> 7
        const monday = new Date(simple);
        monday.setUTCDate(simple.getUTCDate() - dayOfWeek + 1);
        const sunday = new Date(monday);
        sunday.setUTCDate(monday.getUTCDate() + 6);
        const fmt = (d) => d.toISOString().split('T')[0];
        return { from: fmt(monday), to: fmt(sunday) };
    }

    // monthly — value is "YYYY-MM" from <input type="month">
    const [year, month] = value.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return { from: `${value}-01`, to: `${value}-${String(lastDay).padStart(2, '0')}` };
};

const formatAxisNumber = (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v;
};

const chartTooltipStyle = {
    contentStyle: { background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 },
    labelStyle: { color: "#c3c2b7" },
};

const PeriodTabs = ({ period, setPeriod }) => (
    <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        {["daily", "weekly", "monthly"].map((p) => (
            <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
            >
                {p}
            </button>
        ))}
    </div>
);

const EfficiencyBadge = ({ lacking }) => (
    <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${lacking ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"
            }`}
    >
        {lacking ? "Lacking" : "On Track"}
    </span>
);

const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(0)}%`);

const StatTile = ({ icon: Icon, label, value, tone = "neutral" }) => (
    <div className="glass-card p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            tone === "good" ? "bg-green-500/10 text-green-400" : tone === "bad" ? "bg-red-500/10 text-red-400" : "bg-primary/10 text-primary"
        }`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <div className="text-lg font-bold text-foreground leading-tight">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
        </div>
    </div>
);

// Quick at-a-glance summary computed from the report — a stat tile communicates faster than a chart for a single number
const buildSummaryStats = (report) => {
    const totals = report.timeSeries.reduce((acc, b) => ({
        plannedLabour: acc.plannedLabour + b.plannedLabour,
        actualLabour: acc.actualLabour + b.actualLabour,
        plannedWork: acc.plannedWork + b.plannedWork,
        actualWork: acc.actualWork + b.actualWork,
        materialPlanned: acc.materialPlanned + b.materialPlanned,
        materialUsed: acc.materialUsed + b.materialUsed,
    }), { plannedLabour: 0, actualLabour: 0, plannedWork: 0, actualWork: 0, materialPlanned: 0, materialUsed: 0 });

    const labourEfficiency = totals.plannedLabour > 0 ? totals.actualLabour / totals.plannedLabour : null;
    const workEfficiency = totals.plannedWork > 0 ? totals.actualWork / totals.plannedWork : null;
    const materialVariance = totals.materialPlanned > 0 ? (totals.materialUsed - totals.materialPlanned) / totals.materialPlanned : null;
    const contractorsLacking = report.contractors.filter((c) => c.lacking).length;
    const engineersLacking = report.engineers.filter((e) => e.lacking).length;
    const materialLossCount = report.materialLossSignals?.length || 0;

    return { labourEfficiency, workEfficiency, materialVariance, contractorsLacking, engineersLacking, materialLossCount };
};

const PerformanceTable = ({ title, icon: Icon, rows, columns }) => (
    <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
            <Icon className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        </div>
        {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for this period.</p>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-xs text-muted-foreground uppercase border-b border-white/10">
                            {columns.map((c) => (
                                <th key={c.key} className="text-left py-2 pr-4 font-medium whitespace-nowrap">{c.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row, i) => (
                            <tr key={i}>
                                {columns.map((c) => (
                                    <td key={c.key} className="py-2.5 pr-4 whitespace-nowrap">{c.render ? c.render(row) : row[c.key]}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

const AIAnalysisPanel = ({ analysis, onDownloadPdf }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-5 border border-primary/20">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">AI Analysis</h4>
                {analysis.createdAt && (
                    <span className="text-xs text-muted-foreground">
                        · {new Date(analysis.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                )}
            </div>
            <button
                onClick={onDownloadPdf}
                className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-all"
            >
                <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
        </div>

        <p className="text-sm text-foreground/90">{analysis.summary}</p>

        {analysis.underperformers?.length > 0 && (
            <div>
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Who's Lacking</h5>
                <div className="space-y-2">
                    {analysis.underperformers.map((u, i) => (
                        <div key={i} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm">
                            <div className="flex items-center gap-2 font-semibold text-foreground">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> {u.name} <span className="text-xs text-muted-foreground font-normal">({u.role})</span>
                            </div>
                            <p className="text-muted-foreground mt-1">{u.issue}</p>
                            <p className="text-xs text-muted-foreground/70 mt-1 italic">{u.evidence}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {analysis.discrepancies?.length > 0 && (
            <div>
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Material / Work Discrepancies</h5>
                <div className="space-y-2">
                    {analysis.discrepancies.map((d, i) => (
                        <div key={i} className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm">
                            <div className="font-semibold text-foreground">{d.area}</div>
                            <div className="text-xs text-muted-foreground mt-1">Expected: {d.expected} · Actual: {d.actual}</div>
                            <p className="text-muted-foreground mt-1">{d.note}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {analysis.recommendations?.length > 0 && (
            <div>
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">What To Do Next</h5>
                <div className="space-y-2">
                    {analysis.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${r.priority === 'high' ? 'bg-red-500/20 text-red-400' : r.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-muted-foreground'
                                }`}>{r.priority}</span>
                            <span className="text-foreground/90">{r.action}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </motion.div>
);

const CeoReportPanel = ({ period, site, disabled }) => {
    const [ceoEmail, setCeoEmail] = useState("");
    const [isSavingEmail, setIsSavingEmail] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showScheduler, setShowScheduler] = useState(false);
    const [scheduledFor, setScheduledFor] = useState("");
    const queryClient = useQueryClient();

    const { data: schedule = [] } = useQuery({ queryKey: ["ceoReportSchedule"], queryFn: getCeoReportSchedule });

    useEffect(() => {
        settingsService.getSetting('ceo_email').then((res) => {
            if (res?.value) setCeoEmail(res.value);
        }).catch(() => { });
    }, []);

    const handleSaveEmail = async () => {
        if (!ceoEmail.trim()) return;
        setIsSavingEmail(true);
        try {
            await settingsService.updateSetting('ceo_email', ceoEmail.trim(), 'CEO email for AI audio progress briefings');
            toast.success("CEO email saved");
        } catch (error) {
            toast.error(error.message || "Failed to save CEO email");
        } finally {
            setIsSavingEmail(false);
        }
    };

    const handleSend = async (shouldSchedule) => {
        if (!ceoEmail.trim()) {
            toast.error("Enter the CEO's email first");
            return;
        }
        setIsSending(true);
        try {
            const result = await sendCeoReport({
                period, site: site || undefined, ceoEmail: ceoEmail.trim(),
                scheduledFor: shouldSchedule ? scheduledFor : undefined,
            });
            if (result.scheduled) {
                toast.success(`Briefing scheduled for ${new Date(result.report.scheduledFor).toLocaleString('en-IN')}`);
                setShowScheduler(false);
                setScheduledFor("");
            } else {
                toast.success("CEO briefing sent!");
            }
            queryClient.invalidateQueries({ queryKey: ["ceoReportSchedule"] });
        } catch (error) {
            toast.error(error.message || "Failed to send CEO report");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Email CEO Audio Briefing</h4>
            </div>
            <p className="text-xs text-muted-foreground">
                Sends a ~1 minute AI-narrated audio briefing (who's lacking, why, and what to do next) for the currently selected {period} report, as an email attachment.
            </p>

            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="email"
                    value={ceoEmail}
                    onChange={(e) => setCeoEmail(e.target.value)}
                    placeholder="ceo@company.com"
                    className="flex-1 min-w-[220px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                    onClick={handleSaveEmail}
                    disabled={isSavingEmail}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                >
                    {isSavingEmail ? "Saving..." : "Save Email"}
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={() => handleSend(false)}
                    disabled={isSending || disabled}
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-primary hover:brightness-110 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Now
                </button>
                <button
                    onClick={() => setShowScheduler((v) => !v)}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all border border-white/10"
                >
                    <Clock className="w-4 h-4" /> Schedule for Later
                </button>
            </div>

            <AnimatePresence>
                {showScheduler && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 overflow-hidden">
                        <input
                            type="datetime-local"
                            value={scheduledFor}
                            onChange={(e) => setScheduledFor(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <button
                            onClick={() => handleSend(true)}
                            disabled={isSending || !scheduledFor}
                            className="text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                            Schedule
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {schedule.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                    {schedule.slice(0, 5).map((s) => (
                        <div key={s._id} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                                {s.ceoEmail} · {s.period} · {new Date(s.scheduledFor).toLocaleString('en-IN')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-medium ${s.status === 'sent' ? 'bg-green-500/10 text-green-400' : s.status === 'failed' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                                }`}>
                                {s.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ProgressReportDashboard = () => {
    const [period, setPeriod] = useState("daily");
    const [site, setSite] = useState("");
    const [pickerValue, setPickerValue] = useState("");
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const queryClient = useQueryClient();

    const { from, to } = pickerValueToRange(period, pickerValue);

    // Picking a date/week/month only makes sense for the matching period — reset when switching
    const handlePeriodChange = (p) => {
        setPeriod(p);
        setPickerValue("");
    };

    const { data: sites = [] } = useQuery({ queryKey: ["reportSites"], queryFn: getReportSites });

    const { data: report, isLoading } = useQuery({
        queryKey: ["progressReport", period, site, from, to],
        queryFn: () => getProgressReport({ period, site: site || undefined, from, to }),
    });

    const { data: history = [] } = useQuery({
        queryKey: ["analysisHistory", period, site],
        queryFn: () => getAnalysisHistory({ period, site: site || undefined }),
    });

    const handleGenerateAI = async () => {
        setIsAnalyzing(true);
        setAiAnalysis(null);
        try {
            const result = await analyzeProgressReport({ period, site: site || undefined, from, to });
            setAiAnalysis(result);
            queryClient.invalidateQueries({ queryKey: ["analysisHistory"] });
        } catch (error) {
            toast.error(error.message || "Failed to generate AI analysis");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDownloadPdf = () => {
        if (aiAnalysis) generateProgressAnalysisPDF(aiAnalysis);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start sm:items-center justify-between gap-4">
                <PeriodTabs period={period} setPeriod={handlePeriodChange} />
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <input
                            type={period === 'daily' ? 'date' : period === 'weekly' ? 'week' : 'month'}
                            value={pickerValue}
                            onChange={(e) => setPickerValue(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            title={period === 'daily' ? 'Pick a day' : period === 'weekly' ? 'Pick a week' : 'Pick a month'}
                        />
                        {pickerValue && (
                            <button
                                type="button"
                                onClick={() => setPickerValue("")}
                                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                                title="Clear and use default range"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <select
                        value={site}
                        onChange={(e) => setSite(e.target.value)}
                        className="w-48 max-w-[12rem] truncate bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="">All Sites</option>
                        {sites.map((s) => (
                            <option key={s} value={s} className="bg-[#1e1e2d]">
                                {s.length > 60 ? `${s.slice(0, 60)}…` : s}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleGenerateAI}
                        disabled={isAnalyzing || isLoading || !report?.entryCount}
                        className="shrink-0 flex items-center gap-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isAnalyzing ? "Analyzing..." : "Generate AI Analysis"}
                    </button>

                    <div className="relative shrink-0">
                        <button
                            onClick={() => setIsHistoryOpen((v) => !v)}
                            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all border border-white/10"
                        >
                            <History className="w-4 h-4" /> History ({history.length})
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isHistoryOpen ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                            {isHistoryOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1a2e] shadow-2xl z-20"
                                >
                                    {history.length === 0 ? (
                                        <p className="p-4 text-sm text-muted-foreground">No past analyses for this period/site yet.</p>
                                    ) : (
                                        history.map((h) => (
                                            <button
                                                key={h._id}
                                                onClick={() => { setAiAnalysis(h); setIsHistoryOpen(false); }}
                                                className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                                            >
                                                <div className="text-sm font-medium text-foreground">
                                                    {new Date(h.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{h.summary}</div>
                                            </button>
                                        ))
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="glass-card p-10 text-center text-muted-foreground">Loading report…</div>
            ) : !report?.entryCount ? (
                <div className="glass-card p-10 text-center text-muted-foreground">No daily progress entries found for this period/site.</div>
            ) : (
                <>
                    {(() => {
                        const s = buildSummaryStats(report);
                        return (
                            <>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
                                    <StatTile icon={Gauge} label="Labour Efficiency" value={pct(s.labourEfficiency)} tone={s.labourEfficiency == null ? "neutral" : s.labourEfficiency < 0.7 ? "bad" : "good"} />
                                    <StatTile icon={TrendingUp} label="Work Efficiency" value={pct(s.workEfficiency)} tone={s.workEfficiency == null ? "neutral" : s.workEfficiency < 0.7 ? "bad" : "good"} />
                                    <StatTile icon={Package} label="Material Variance" value={s.materialVariance == null ? "—" : `${s.materialVariance > 0 ? "+" : ""}${(s.materialVariance * 100).toFixed(0)}%`} tone={s.materialVariance == null ? "neutral" : Math.abs(s.materialVariance) > 0.2 ? "bad" : "good"} />
                                    <StatTile icon={Users2} label="Contractors Lacking" value={s.contractorsLacking} tone={s.contractorsLacking > 0 ? "bad" : "good"} />
                                    <StatTile icon={Users2} label="Engineers Lacking" value={s.engineersLacking} tone={s.engineersLacking > 0 ? "bad" : "good"} />
                                    <StatTile icon={ShieldAlert} label="Material Loss Alerts" value={s.materialLossCount} tone={s.materialLossCount > 0 ? "bad" : "good"} />
                                </div>

                                {report.materialLossSignals?.length > 0 && (
                                    <div className="glass-card p-5 border border-red-500/20">
                                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4 text-red-400" /> Material Loss Alerts — BOQ vs Actual Consumption
                                        </h4>
                                        <p className="text-xs text-muted-foreground mb-3">
                                            More material was used than the BOQ/BOM sheet says the completed work should have needed. Possible causes: wastage, over-issuance, pilferage, or incorrect BOQ.
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-xs text-muted-foreground uppercase border-b border-white/10">
                                                        <th className="text-left py-2 pr-4">Material</th>
                                                        <th className="text-left py-2 pr-4">Task</th>
                                                        <th className="text-left py-2 pr-4">Site</th>
                                                        <th className="text-left py-2 pr-4">BOQ-Expected</th>
                                                        <th className="text-left py-2 pr-4">Actually Used</th>
                                                        <th className="text-left py-2 pr-4">Overuse</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {report.materialLossSignals.map((s2, i) => (
                                                        <tr key={i}>
                                                            <td className="py-2 pr-4 font-medium text-foreground">{s2.material}</td>
                                                            <td className="py-2 pr-4 text-muted-foreground">{s2.task}</td>
                                                            <td className="py-2 pr-4 text-muted-foreground">{s2.site}</td>
                                                            <td className="py-2 pr-4 text-foreground/90">{s2.expectedQty} {s2.unit}</td>
                                                            <td className="py-2 pr-4 text-foreground/90">{s2.actualQty} {s2.unit}</td>
                                                            <td className="py-2 pr-4 font-semibold text-red-400">+{(s2.overusePct * 100).toFixed(0)}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}

                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="glass-card p-5">
                            <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Labour: Planned vs Actual</h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={report.timeSeries}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                                    <XAxis dataKey="bucket" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
                                    <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatAxisNumber} />
                                    <Tooltip {...chartTooltipStyle} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Line type="monotone" dataKey="plannedLabour" name="Planned" stroke={COLOR_PLANNED} strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="actualLabour" name="Actual" stroke={COLOR_ACTUAL} strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="glass-card p-5">
                            <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Work Output: Planned vs Actual</h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={report.timeSeries}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                                    <XAxis dataKey="bucket" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
                                    <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatAxisNumber} />
                                    <Tooltip {...chartTooltipStyle} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Line type="monotone" dataKey="plannedWork" name="Planned" stroke={COLOR_PLANNED} strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="actualWork" name="Actual" stroke={COLOR_ACTUAL} strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="glass-card p-5">
                            <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Material: Planned vs Used</h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={report.timeSeries}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                                    <XAxis dataKey="bucket" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
                                    <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatAxisNumber} />
                                    <Tooltip {...chartTooltipStyle} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="materialPlanned" name="Planned" fill={COLOR_PLANNED} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="materialUsed" name="Used" fill={COLOR_ACTUAL} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                        <PerformanceTable
                            title="Contractor Performance"
                            icon={Users2}
                            rows={report.contractors}
                            columns={[
                                { key: "name", label: "Contractor" },
                                { key: "workEfficiency", label: "Work Efficiency", render: (r) => pct(r.workEfficiency) },
                                { key: "labourEfficiency", label: "Labour Efficiency", render: (r) => pct(r.labourEfficiency) },
                                { key: "lacking", label: "Status", render: (r) => <EfficiencyBadge lacking={r.lacking} /> },
                            ]}
                        />
                        <PerformanceTable
                            title="Site Engineer Performance"
                            icon={Users2}
                            rows={report.engineers}
                            columns={[
                                { key: "name", label: "Engineer" },
                                { key: "labourEfficiency", label: "Labour Efficiency", render: (r) => pct(r.labourEfficiency) },
                                { key: "materialVariancePct", label: "Material Variance", render: (r) => (r.materialVariancePct > 0 ? "+" : "") + (r.materialVariancePct * 100).toFixed(0) + "%" },
                                { key: "lacking", label: "Status", render: (r) => <EfficiencyBadge lacking={r.lacking} /> },
                            ]}
                        />
                    </div>
                </>
            )}

            {aiAnalysis && <AIAnalysisPanel analysis={aiAnalysis} onDownloadPdf={handleDownloadPdf} />}

            <CeoReportPanel period={period} site={site} disabled={!report?.entryCount} />
        </div>
    );
};

export default ProgressReportDashboard;
