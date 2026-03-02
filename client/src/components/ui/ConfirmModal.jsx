import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Are you sure?",
    message = "This action cannot be undone.",
    confirmText = "Yes, Delete",
    cancelText = "Cancel",
    isDestructive = true
}) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
        } finally {
            setIsLoading(false);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => !isLoading && onClose()}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={`bg-[#1a1a2e] border ${isDestructive ? 'border-red-500/30' : 'border-yellow-500/30'} rounded-2xl p-6 max-w-md w-full shadow-2xl`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Icon */}
                        <div className={`flex items-center justify-center w-14 h-14 rounded-full ${isDestructive ? 'bg-red-500/15 border border-red-500/30' : 'bg-yellow-500/15 border border-yellow-500/30'} mx-auto mb-5`}>
                            {isDestructive ? <Trash2 className="w-7 h-7 text-red-400" /> : <AlertTriangle className="w-7 h-7 text-yellow-400" />}
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-foreground text-center mb-2">{title}</h3>

                        {/* Subtitle */}
                        <p className="text-sm text-muted-foreground text-center mb-6">
                            {message}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/15 text-foreground transition-colors disabled:opacity-50"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isLoading}
                                className={`flex-1 py-2.5 rounded-xl font-medium text-sm ${isDestructive ? 'bg-red-500/80 hover:bg-red-500' : 'bg-primary/80 hover:bg-primary'} text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                            >
                                {isLoading ? (
                                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                                ) : (
                                    <>{isDestructive ? <Trash2 className="w-4 h-4" /> : null} {confirmText}</>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
