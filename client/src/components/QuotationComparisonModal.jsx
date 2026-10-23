import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Sparkles, Crown } from 'lucide-react';
import { generateQuotationComparisonPDF } from '@/utils/quotationComparisonPdfExport';

const slotLabel = (slot) => slot.replace('quotation', 'Quotation ');

// result: { quotations: { quotation1: {vendorName, totalAmount}, ... }, cheapest, reasoning }
const QuotationComparisonModal = ({ isOpen, onClose, result, poNumber, vendorName }) => {
    if (!result) return null;

    const slots = Object.keys(result.quotations || {});

    const handleDownload = () => {
        generateQuotationComparisonPDF({ poNumber, vendorName, ...result });
    };

    return (
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
                        className="bg-[#1a1a2e] border border-primary/30 rounded-2xl p-6 max-w-2xl w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-5">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/15 border border-primary/30">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Quotation Comparison</h3>
                                    <p className="text-xs text-muted-foreground">AI-generated comparison across {slots.length} quotation{slots.length > 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2 mb-5">
                            {slots.map((slot) => {
                                const info = result.quotations[slot] || {};
                                const isCheapest = slot === result.cheapest;
                                return (
                                    <div
                                        key={slot}
                                        className={`flex items-center justify-between rounded-xl px-4 py-3 border ${isCheapest ? 'border-green-400/40 bg-green-400/10' : 'border-white/10 bg-white/[0.02]'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isCheapest && <Crown className="w-4 h-4 text-green-400" />}
                                            <div>
                                                <div className="text-sm font-semibold text-foreground">{slotLabel(slot)}</div>
                                                <div className="text-xs text-muted-foreground">{info.vendorName || 'Vendor not detected'}</div>
                                            </div>
                                        </div>
                                        <div className={`text-sm font-bold ${isCheapest ? 'text-green-400' : 'text-foreground/80'}`}>
                                            {info.totalAmount != null ? `₹${Number(info.totalAmount).toLocaleString('en-IN')}` : 'N/A'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {result.reasoning && (
                            <div className="text-xs text-muted-foreground bg-white/[0.03] border border-white/10 rounded-lg p-3 mb-5">
                                <span className="font-semibold text-foreground/80">AI Reasoning: </span>
                                {result.reasoning}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/15 text-foreground transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm bg-primary/80 hover:bg-primary text-white transition-colors"
                            >
                                <Download className="w-4 h-4" /> Download PDF
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default QuotationComparisonModal;
