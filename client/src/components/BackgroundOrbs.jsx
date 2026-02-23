import { motion } from "framer-motion";
const BackgroundOrbs = () => {
    return (<div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Primary blue orb - top right */}
      <motion.div className="gradient-orb-primary w-[600px] h-[600px] -top-48 -right-48" animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
        }} transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
        }}/>
      
      {/* Secondary emerald orb - bottom left */}
      <motion.div className="gradient-orb-secondary w-[500px] h-[500px] -bottom-32 -left-32" animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
        }} transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
        }}/>
      
      {/* Accent purple orb - center */}
      <motion.div className="gradient-orb-accent w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10" animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
        }} transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
        }}/>
    </div>);
};
export default BackgroundOrbs;
