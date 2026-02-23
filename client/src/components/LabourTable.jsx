import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deploymentStore } from "@/lib/deploymentStore";
const LabourTable = ({ rows, onChange, readOnly = false }) => {
  const [availableContractors, setAvailableContractors] = useState([]);

  useEffect(() => {
    setAvailableContractors(deploymentStore.getContractors());
    const unsubscribe = deploymentStore.subscribe(() => {
      setAvailableContractors(deploymentStore.getContractors());
    });
    return unsubscribe;
  }, []);

  // Auto-add row when last row is filled
  useEffect(() => {
    if (readOnly) return;

    const lastRow = rows[rows.length - 1];
    const isLastRowFilled =
      lastRow.contractorName !== "" &&
      (lastRow.plannedLabour !== "" && lastRow.plannedLabour >= 0) &&
      (lastRow.actualLabour !== "" && lastRow.actualLabour >= 0);

    if (isLastRowFilled) {
      onChange([...rows, { contractorName: "", plannedLabour: "", actualLabour: "" }]);
    }
  }, [rows, readOnly, onChange]);

  const handleCellChange = (index, field, value) => {
    const newRows = [...rows];
    if (field === "contractorName") {
      newRows[index][field] = value;
    }
    else {
      newRows[index][field] = value === "" ? "" : parseInt(value) || 0;
    }
    onChange(newRows);
  };
  const addRow = () => {
    onChange([...rows, { contractorName: "", plannedLabour: "", actualLabour: "" }]);
  };
  const removeRow = (index) => {
    // Prevent removing the last empty row if it's the only one
    if (rows.length > 1) {
      onChange(rows.filter((_, i) => i !== index));
    }
  };
  return (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-foreground">Labour Details</label>
    </div>

    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr,100px,100px,40px] gap-2 p-3 bg-white/5 border-b border-white/10">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Contractor/Supplier Name
        </div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
          Planned
        </div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
          Actual
        </div>
        <div></div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/5">
        {rows.map((row, index) => (<motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="grid grid-cols-[1fr,100px,100px,40px] gap-2 p-2 hover:bg-white/5 transition-colors group">
          {readOnly ? (
            <Input type="text" value={row.contractorName} disabled className="h-9 bg-white/5 border-white/10 text-sm" />
          ) : (
            <Select
              value={row.contractorName}
              onValueChange={(value) => handleCellChange(index, "contractorName", value)}
            >
              <SelectTrigger className="h-9 bg-white/5 border-white/10 text-sm">
                <SelectValue placeholder="Select Contractor" />
              </SelectTrigger>
              <SelectContent>
                {availableContractors.map((contractor) => (
                  <SelectItem key={contractor.id} value={contractor.name}>
                    {contractor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input type="number" placeholder="0" value={row.plannedLabour} onChange={(e) => handleCellChange(index, "plannedLabour", e.target.value)} disabled={readOnly} className="h-9 bg-white/5 border-white/10 focus:border-secondary/50 text-sm text-center" min={0} />
          <Input type="number" placeholder="0" value={row.actualLabour} onChange={(e) => handleCellChange(index, "actualLabour", e.target.value)} disabled={readOnly} className="h-9 bg-white/5 border-white/10 focus:border-secondary/50 text-sm text-center" min={0} />
          {!readOnly && rows.length > 1 && (<motion.button type="button" onClick={() => removeRow(index)} className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Trash2 className="w-4 h-4" />
          </motion.button>)}
        </motion.div>))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-[1fr,100px,100px,40px] gap-2 p-3 bg-white/5 border-t border-white/10">
        <div className="text-sm font-semibold text-foreground">Total</div>
        <div className="text-sm font-semibold text-secondary text-center">
          {rows.reduce((sum, r) => sum + (typeof r.plannedLabour === 'number' ? r.plannedLabour : 0), 0)}
        </div>
        <div className="text-sm font-semibold text-primary text-center">
          {rows.reduce((sum, r) => sum + (typeof r.actualLabour === 'number' ? r.actualLabour : 0), 0)}
        </div>
        <div></div>
      </div>
    </div>
  </motion.div>);
};
export default LabourTable;
