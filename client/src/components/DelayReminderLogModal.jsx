import { motion, AnimatePresence } from 'framer-motion';
import { X, MailWarning } from 'lucide-react';
import { format } from 'date-fns';

const DelayReminderLogModal = ({ isOpen, onClose, po }) => {
    if (!po) return null;

    const log = [...(po.delayReminderLog || [])].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

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
                        className="bg-[#1a1a2e] border border-orange-500/30 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-5">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-orange-500/15 border border-orange-500/30">
                                    <MailWarning className="w-5 h-5 text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Delay Reminder Emails</h3>
                                    <p className="text-xs text-muted-foreground">PO {po.poNumber} — sent to {po.vendorEmail || 'vendor'}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {log.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No reminder email history recorded for this PO.</p>
                        ) : (
                            <div className="space-y-4">
                                {log.map((entry, idx) => (
                                    <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                        <div className="flex justify-between items-baseline mb-2">
                                            <span className="text-xs font-semibold text-orange-400">
                                                {entry.sentAt ? format(new Date(entry.sentAt), 'dd MMM yyyy, hh:mm a') : 'Unknown date'}
                                            </span>
                                            {entry.daysLate != null && (
                                                <span className="text-[10px] text-muted-foreground">{entry.daysLate} day{entry.daysLate === 1 ? '' : 's'} overdue</span>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-foreground mb-1">{entry.subject}</p>
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{entry.body}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end mt-5">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/15 text-foreground transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DelayReminderLogModal;
