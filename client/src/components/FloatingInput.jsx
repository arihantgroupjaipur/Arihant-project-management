import { motion } from "framer-motion";
import { forwardRef } from "react";
const FloatingInput = forwardRef(({ label, error, className = "", labelClassName = "", ...props }, ref) => {
    return (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="floating-label-group w-full">
        <input ref={ref} placeholder=" " className={`floating-label-input ${error ? "border-destructive focus:ring-destructive/50" : ""} ${className}`} {...props} />
        <label className={`floating-label ${labelClassName}`}>{label}</label>
        {error && (<motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-destructive text-xs mt-1.5 ml-1">
            {error}
        </motion.p>)}
    </motion.div>);
});
FloatingInput.displayName = "FloatingInput";
export default FloatingInput;
