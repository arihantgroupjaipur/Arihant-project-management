import { motion } from "framer-motion";
import { Activity, Users, Clock } from "lucide-react";
const LiveStatusBar = ({ totalDeployments, activeWorkers, lastUpdate }) => {
    return (<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-card px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="pulse-dot"/>
        <span className="text-sm font-medium text-success">Live Operations</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4 text-primary"/>
          <span>{totalDeployments} Deployments</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4 text-secondary"/>
          <span>{activeWorkers} Active Workers</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4 text-muted-foreground"/>
          <span>Updated: {lastUpdate}</span>
        </div>
      </div>
    </motion.div>);
};
export default LiveStatusBar;
