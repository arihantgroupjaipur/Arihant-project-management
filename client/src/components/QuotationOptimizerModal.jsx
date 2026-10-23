import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Wand2, TrendingDown, Loader2, ArrowLeft, Plus, Download } from 'lucide-react';
import { toast } from 'sonner';
import FileUploadSelector from './FileUploadSelector';
import { generateQuotationOptimizerPDF } from '@/utils/quotationOptimizerPdfExport';

const slotLabel = (slot) => (slot ? slot.replace('quotation', 'Q') : '—');
const fmtMoney = (n) => (n == null ? 'N/A' : `₹${Number(n).toLocaleString('en-IN')}`);

const MAX_EXTRA_SLOTS = 5; // official 3 + up to 5 extra = 8, matching the server's cap

// quotationFiles: { quotation1: File|null, quotation2: File|null, quotation3: File|null }
// existingUrls: { quotation1Url, quotation2Url, quotation3Url } — already-saved S3 keys on the PO
// onFileSelect(file, 'quotation1'|'quotation2'|'quotation3') — lifts the picked file into the parent's state
// onAnalyze(extraFiles: File[]) — parent uploads any pending files (official + extra) + calls the AI endpoint, resolves with the result
// onApplyToItems(items) — parent fills the PO's item table from the optimized result
const QuotationOptimizerModal = ({ isOpen, onClose, quotationFiles, existingUrls, onFileSelect, onAnalyze, onApplyToItems, poNumber, vendorName }) => {
    const [phase, setPhase] = useState('upload'); // 'upload' | 'result'
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [extraFiles, setExtraFiles] = useState([]); // beyond the 3 official slots, for a wider comparison only

    useEffect(() => {
        if (isOpen) {
            setPhase('upload');
            setResult(null);
            setExtraFiles([]);
        }
    }, [isOpen]);

    const officialCount = ['quotation1', 'quotation2', 'quotation3']
        .filter((key) => quotationFiles?.[key] || existingUrls?.[`${key}Url`]).length;
    const extraCount = extraFiles.filter(Boolean).length;
    const selectedCount = officialCount + extraCount;

    const addExtraSlot = () => setExtraFiles((prev) => [...prev, null]);
    const setExtraFile = (index, file) => setExtraFiles((prev) => prev.map((f, i) => (i === index ? file : f)));
    const removeExtraSlot = (index) => setExtraFiles((prev) => prev.filter((_, i) => i !== index));

    const handleAnalyze = async () => {
        if (selectedCount < 2) {
            toast.error('Select at least 2 quotations to analyze.');
            return;
        }
        setIsAnalyzing(true);
        try {
            const data = await onAnalyze(extraFiles.filter(Boolean));
            setResult(data);
            setPhase('result');
        } catch (error) {
            toast.error(error.message || 'Failed to optimize quotations');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApply = () => {
        onApplyToItems(result.items || []);
        onClose();
    };

    const handleDownload = () => {
        generateQuotationOptimizerPDF({ poNumber, vendorName, ...result });
    };

    const items = result?.items || [];
    const singleVendorEntries = Object.entries(result?.singleVendorTotals || {}).filter(([, v]) => v != null);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="bg-[#1a1a2e] border border-primary/30 rounded-2xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-5">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/15 border border-primary/30">
                                    <Wand2 className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {phase === 'upload' ? 'Build an AI-Optimized Quotation' : 'AI-Optimized Quotation'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {phase === 'upload'
                                            ? 'Upload 2 or more vendor quotations — AI picks the cheapest price per item'
                                            : 'Cheapest price per item, picked across all uploaded quotations'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {phase === 'upload' && (
                            <>
                                <div className="grid md:grid-cols-3 gap-4 mb-6">
                                    {[1, 2, 3].map((num) => {
                                        const key = `quotation${num}`;
                                        return (
                                            <div key={key} className="relative space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                                                {quotationFiles?.[key] && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onFileSelect(null, key)}
                                                        className="absolute top-2 right-2 text-muted-foreground hover:text-red-400 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <p className="text-sm font-medium text-muted-foreground">Quotation {num}</p>
                                                <FileUploadSelector
                                                    accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg"
                                                    onFileSelect={(file) => onFileSelect(file, key)}
                                                    title={`Upload Quotation ${num}`}
                                                >
                                                    <button type="button" className="block w-full text-left text-sm text-primary bg-primary/20 hover:bg-primary/30 py-2 px-4 rounded-full font-semibold transition-all">
                                                        {quotationFiles?.[key] ? quotationFiles[key].name : 'Select File or Take Photo'}
                                                    </button>
                                                </FileUploadSelector>
                                                {existingUrls?.[`${key}Url`] && !quotationFiles?.[key] && (
                                                    <p className="text-xs text-green-400">Existing file attached</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {extraFiles.map((file, index) => (
                                        <div key={`extra-${index}`} className="relative space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                                            <button
                                                type="button"
                                                onClick={() => removeExtraSlot(index)}
                                                className="absolute top-2 right-2 text-muted-foreground hover:text-red-400 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <p className="text-sm font-medium text-muted-foreground">Quotation {index + 4}</p>
                                            <FileUploadSelector
                                                accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg"
                                                onFileSelect={(f) => setExtraFile(index, f)}
                                                title={`Upload Quotation ${index + 4}`}
                                            >
                                                <button type="button" className="block w-full text-left text-sm text-primary bg-primary/20 hover:bg-primary/30 py-2 px-4 rounded-full font-semibold transition-all">
                                                    {file ? file.name : 'Select File or Take Photo'}
                                                </button>
                                            </FileUploadSelector>
                                        </div>
                                    ))}
                                </div>
                                {extraFiles.length < MAX_EXTRA_SLOTS && (
                                    <button
                                        type="button"
                                        onClick={addExtraSlot}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 mb-6 rounded-xl border border-dashed border-white/15 text-sm text-muted-foreground hover:text-foreground hover:border-white/30 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Add Another Quotation
                                    </button>
                                )}
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || selectedCount < 2}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-primary/80 hover:bg-primary text-white transition-colors disabled:opacity-50"
                                >
                                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {isAnalyzing ? 'Analyzing quotations...' : 'Analyze with AI & Build Optimal Quotation'}
                                </button>
                                {selectedCount < 2 && (
                                    <p className="text-xs text-muted-foreground text-center mt-2">Select at least 2 quotations to continue</p>
                                )}
                            </>
                        )}

                        {phase === 'result' && result && (
                            <>
                                <div className="grid sm:grid-cols-2 gap-3 mb-5">
                                    <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4">
                                        <div className="flex items-center gap-2 text-green-400 text-xs font-semibold uppercase tracking-wide mb-1">
                                            <TrendingDown className="w-3.5 h-3.5" /> Optimal Total
                                        </div>
                                        <div className="text-xl font-bold text-foreground">{fmtMoney(result.optimalTotal)}</div>
                                        {result.estimatedSavings > 0 && (
                                            <div className="text-xs text-green-400 mt-1">Saves ~{fmtMoney(result.estimatedSavings)} vs. buying from one vendor</div>
                                        )}
                                    </div>
                                    {singleVendorEntries.length > 0 && (
                                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">If bought from a single vendor</div>
                                            <div className="space-y-1">
                                                {singleVendorEntries.map(([slot, total]) => (
                                                    <div key={slot} className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">{slotLabel(slot)}</span>
                                                        <span className="text-foreground/90 font-medium">{fmtMoney(total)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="overflow-x-auto mb-5">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs text-muted-foreground uppercase border-b border-white/10">
                                                <th className="text-left py-2 pr-4">Material</th>
                                                <th className="text-left py-2 pr-4">Unit</th>
                                                <th className="text-left py-2 pr-4">Qty</th>
                                                <th className="text-left py-2 pr-4">Rate</th>
                                                <th className="text-left py-2 pr-4">Amount</th>
                                                <th className="text-left py-2 pr-4">Best Source</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {items.map((item, i) => (
                                                <tr key={i}>
                                                    <td className="py-2 pr-4 font-medium text-foreground">{item.materialDescription}</td>
                                                    <td className="py-2 pr-4 text-muted-foreground">{item.unit}</td>
                                                    <td className="py-2 pr-4 text-foreground/90">{item.quantity}</td>
                                                    <td className="py-2 pr-4 text-foreground/90">₹{item.rate}</td>
                                                    <td className="py-2 pr-4 font-semibold text-green-400">₹{item.amount}</td>
                                                    <td className="py-2 pr-4">
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                                                            {slotLabel(item.bestSource)}{item.bestVendorName ? ` · ${item.bestVendorName}` : ''}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {result.reasoning && (
                                    <div className="text-xs text-muted-foreground bg-white/[0.03] border border-white/10 rounded-lg p-3 mb-5">
                                        <span className="font-semibold text-foreground/80 inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Reasoning: </span>
                                        {result.reasoning}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => setPhase('upload')}
                                        className="flex items-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/15 text-foreground transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="py-2.5 px-4 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/15 text-foreground transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        disabled={items.length === 0}
                                        className="flex items-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/15 text-foreground transition-colors disabled:opacity-50"
                                    >
                                        <Download className="w-4 h-4" /> Download PDF
                                    </button>
                                    <button
                                        onClick={handleApply}
                                        disabled={items.length === 0}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm bg-primary/80 hover:bg-primary text-white transition-colors disabled:opacity-50"
                                    >
                                        <Wand2 className="w-4 h-4" /> Apply to PO Items
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default QuotationOptimizerModal;
