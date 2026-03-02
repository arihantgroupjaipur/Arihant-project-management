import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, FileUp, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const FileUploadSelector = ({
    onFileSelect,
    accept = "image/*,application/pdf,.pdf,.jpg,.jpeg,.png",
    children,
    title = "Choose Upload Method"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [facingMode, setFacingMode] = useState("environment");

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const handleFileClick = () => {
        setIsOpen(false);
        fileInputRef.current?.click();
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const startCamera = async (mode = facingMode) => {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: mode }
                });

                setIsCameraActive(true);
                // Need a small timeout to let the video element render before assigning srcObject
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                }, 50);

                streamRef.current = stream;
            } else {
                toast.error("Camera API not supported in this browser.");
                setIsOpen(false);
                cameraInputRef.current?.click();
            }
        } catch (err) {
            console.error("Camera access denied or error:", err);
            toast.error("Could not access camera. Please check permissions or use file upload.");
            setIsOpen(false);
            cameraInputRef.current?.click();
        }
    };

    const toggleCameraMode = () => {
        stopCamera();
        const newMode = facingMode === "environment" ? "user" : "environment";
        setFacingMode(newMode);
        startCamera(newMode);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');

            // Mirror image if using front camera
            if (facingMode === "user") {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }

            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    onFileSelect(file);
                    closeAll();
                }
            }, 'image/jpeg', 0.9);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
    };

    const closeAll = () => {
        stopCamera();
        setIsOpen(false);
    };

    const handleTriggerClick = (e) => {
        e.preventDefault();
        setIsOpen(true);
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <>
            <div onClick={handleTriggerClick} className="relative inline-block w-full">
                {children}
            </div>

            {/* Hidden Inputs */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={accept}
                onChange={handleFileChange}
            />
            {/* Native fallback inside the DOM */}
            <input
                type="file"
                ref={cameraInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
            />

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                            onClick={closeAll}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="bg-[#1a1a2e] border border-primary/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={closeAll}
                                    className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors z-10 bg-black/40 p-1.5 rounded-full"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {!isCameraActive ? (
                                    <>
                                        <h3 className="text-lg font-semibold text-foreground mb-6 text-center">{title}</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => startCamera()}
                                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                                            >
                                                <Camera className="w-8 h-8" />
                                                <span className="font-medium text-sm">Camera</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleFileClick}
                                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 transition-colors"
                                            >
                                                <FileUp className="w-8 h-8" />
                                                <span className="font-medium text-sm">Upload File</span>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Take a Photo</h3>
                                        <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center mb-6 border border-white/10">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                                            />
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <button
                                                type="button"
                                                onClick={toggleCameraMode}
                                                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center justify-center"
                                                title="Switch Camera"
                                            >
                                                <RefreshCw className="w-5 h-5" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={capturePhoto}
                                                className="w-16 h-16 bg-primary rounded-full border-4 border-[#1a1a2e] outline outline-2 outline-primary hover:bg-primary/90 transition-all flex items-center justify-center shadow-lg shadow-primary/20"
                                            >
                                                <Camera className="w-6 h-6 text-primary-foreground" />
                                            </button>

                                            <div className="w-[44px]"></div> {/* Spacer for symmetry */}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                , document.body)}
        </>
    );
};

export default FileUploadSelector;
