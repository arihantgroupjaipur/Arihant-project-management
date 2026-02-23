import { useRef, forwardRef, useImperativeHandle } from "react";
import SignatureCanvas from "react-signature-canvas";
import { motion } from "framer-motion";
import { Eraser } from "lucide-react";

const SignaturePad = forwardRef(({ label }, ref) => {
    const sigCanvas = useRef(null);

    useImperativeHandle(ref, () => ({
        clear: () => {
            sigCanvas.current?.clear();
        },
        isEmpty: () => {
            return sigCanvas.current?.isEmpty();
        },
        toDataURL: () => {
            return sigCanvas.current?.toDataURL();
        },
        fromDataURL: (data) => {
            if (data && sigCanvas.current) {
                sigCanvas.current.fromDataURL(data);
            }
        }
    }));

    const clearSignature = () => {
        sigCanvas.current?.clear();
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                <motion.button
                    type="button"
                    onClick={clearSignature}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Eraser className="w-3 h-3" />
                    Clear
                </motion.button>
            </div>
            <div className="border border-white/10 rounded-lg bg-white overflow-hidden">
                <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{
                        className: "signature-canvas w-full h-32 cursor-crosshair",
                    }}
                    backgroundColor="white"
                    penColor="black"
                />
            </div>
            <p className="text-xs text-muted-foreground italic">
                Draw your signature above using mouse or touch
            </p>
        </div>
    );
});

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
