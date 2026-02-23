import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
const RoleCard = ({ title, description, icon: Icon, route, colorScheme, index }) => {
    const navigate = useNavigate();
    const glowClass = colorScheme === "blue" ? "glow-blue" : "glow-emerald";
    const iconBgClass = colorScheme === "blue"
        ? "bg-primary/20 text-primary"
        : "bg-secondary/20 text-secondary";
    const borderHoverClass = colorScheme === "blue"
        ? "hover:border-primary/50"
        : "hover:border-secondary/50";
    return (<motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{
            duration: 0.6,
            delay: index * 0.2,
            ease: [0.22, 1, 0.36, 1]
        }} whileHover={{
            scale: 1.02,
            transition: { duration: 0.3 }
        }} whileTap={{ scale: 0.98 }} onClick={() => navigate(route)} className={`
        glass-card cursor-pointer p-8 md:p-12 flex flex-col items-center justify-center
        min-h-[320px] md:min-h-[400px] transition-all duration-500
        ${borderHoverClass} group
      `}>
      <motion.div className={`
          w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center
          ${iconBgClass} mb-6 transition-all duration-500
        `} whileHover={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5 }}>
        <Icon className="w-10 h-10 md:w-12 md:h-12"/>
      </motion.div>
      
      <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground group-hover:text-gradient-primary transition-all duration-300">
        {title}
      </h2>
      
      <p className="text-muted-foreground text-center text-sm md:text-base max-w-xs">
        {description}
      </p>
      
      <motion.div className={`
          mt-8 px-6 py-3 rounded-xl border border-white/10 
          text-sm font-medium text-foreground
          transition-all duration-300 group-hover:${glowClass}
        `} whileHover={{ y: -2 }}>
        Enter Portal →
      </motion.div>
      
      {/* Glow effect on hover */}
      <motion.div className={`
          absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
          transition-opacity duration-500 pointer-events-none
          ${colorScheme === "blue" ? "shadow-[inset_0_0_60px_hsl(217,91%,60%,0.1)]" : "shadow-[inset_0_0_60px_hsl(160,84%,39%,0.1)]"}
        `}/>
    </motion.div>);
};
export default RoleCard;
