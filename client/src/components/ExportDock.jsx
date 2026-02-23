import { motion } from "framer-motion";
import { FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
const ExportDock = ({ onExport }) => {
    const buttons = [
        { icon: FileText, label: "Export PDF", type: "pdf", color: "text-red-400" },
        { icon: FileSpreadsheet, label: "Export Excel", type: "excel", color: "text-green-400" },
        { icon: FileDown, label: "Export CSV", type: "csv", color: "text-blue-400" },
    ];
    const handleExport = (type, label) => {
        onExport(type);
        toast.success(`${label} initiated`, {
            description: "Your file will be ready shortly.",
        });
    };
    return (<motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5, duration: 0.4 }} className="floating-dock">
      {buttons.map((button, index) => (<Tooltip key={button.type}>
          <TooltipTrigger asChild>
            <motion.button onClick={() => handleExport(button.type, button.label)} className={`dock-button ${button.color}`} whileHover={{
                scale: 1.15,
                y: -4,
                transition: { duration: 0.2 }
            }} whileTap={{ scale: 0.95 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + index * 0.1 }}>
              <button.icon className="w-5 h-5"/>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-card border-white/10">
            <p>{button.label}</p>
          </TooltipContent>
        </Tooltip>))}
    </motion.div>);
};
export default ExportDock;
