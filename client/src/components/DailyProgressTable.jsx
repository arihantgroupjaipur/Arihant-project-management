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
import { contractorService } from "@/services/contractorService";
import { workOrderService } from "@/services/workOrderService";

const DailyProgressTable = ({ rows, onChange, onWorkOrderSelect, readOnly = false }) => {
    const [availableContractors, setAvailableContractors] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);
    const statusOptions = ["Pending", "In Progress", "Completed", "On Hold", "Cancelled"];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [contractorsData, workOrdersData] = await Promise.all([
                    contractorService.getAll(),
                    workOrderService.getAllWorkOrders(),
                ]);
                setAvailableContractors(contractorsData);
                setWorkOrders(workOrdersData);
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };
        fetchData();
    }, []);

    // Auto-add row when last row is filled
    useEffect(() => {
        if (readOnly) return;

        const lastRow = rows[rows.length - 1];
        const isLastRowFilled =
            lastRow.contractorName !== "" &&
            lastRow.workOrderNo !== "" &&
            (lastRow.plannedLabour !== "" && lastRow.plannedLabour >= 0) &&
            (lastRow.actualLabour !== "" && lastRow.actualLabour >= 0) &&
            lastRow.plannedWork !== "" &&
            lastRow.actualWork !== "" &&
            lastRow.status !== "";

        if (isLastRowFilled) {
            onChange([...rows, { contractorName: "", workOrderNo: "", plannedLabour: "", actualLabour: "", plannedWork: "", actualWork: "", status: "" }]);
        }
    }, [rows, readOnly, onChange]);

    const handleCellChange = (index, field, value) => {
        const newRows = [...rows];

        if (field === "workOrderNo") {
            newRows[index][field] = value;
            const selectedWO = workOrders.find(wo => wo.workOrderNumber === value);
            if (selectedWO) {
                // Auto-fill fields if found
                const totalPlannedLabour = selectedWO.workItems?.reduce((sum, item) => sum + (item.plannedLabour || 0), 0) || 0;
                const combinedWorkDescription = selectedWO.workItems?.map(item => item.workDescription).join(", ") || "";

                newRows[index].plannedLabour = totalPlannedLabour;
                newRows[index].plannedWork = combinedWorkDescription;

                // Notify parent to auto-fill main form fields
                if (onWorkOrderSelect) {
                    onWorkOrderSelect(selectedWO);
                }
            }
        } else if (field === "plannedLabour" || field === "actualLabour") {
            newRows[index][field] = value === "" ? "" : parseInt(value) || 0;
        } else {
            newRows[index][field] = value;
        }
        onChange(newRows);
    };

    const removeRow = (index) => {
        // Prevent removing the last empty row if it's the only one
        if (rows.length > 1) {
            onChange(rows.filter((_, i) => i !== index));
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Daily Progress Reports</label>
            </div>

            <div className="glass-card overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1.5fr,1fr,100px,100px,1fr,1fr,100px,40px] gap-2 p-3 bg-white/5 border-b border-white/10">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contractor Name</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Order No</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Planned Labour</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Actual Labour</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Planned Work</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actual Work</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</div>
                    <div></div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-white/5">
                    {rows.map((row, index) => (
                        <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="grid grid-cols-[1.5fr,1fr,100px,100px,1fr,1fr,100px,40px] gap-2 p-2 hover:bg-white/5 transition-colors group">
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
                                            <SelectItem key={contractor._id} value={contractor.name}>
                                                {contractor.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {readOnly ? (
                                <Input type="text" value={row.workOrderNo} disabled className="h-9 bg-white/5 border-white/10 text-sm" />
                            ) : (
                                <Select
                                    value={row.workOrderNo}
                                    onValueChange={(value) => handleCellChange(index, "workOrderNo", value)}
                                >
                                    <SelectTrigger className="h-9 bg-white/5 border-white/10 text-sm">
                                        <SelectValue placeholder="Select WO" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {workOrders.map((wo) => (
                                            <SelectItem key={wo._id} value={wo.workOrderNumber}>
                                                {wo.workOrderNumber} - {wo.workDescription?.substring(0, 20)}...
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <Input
                                type="number"
                                placeholder="0"
                                value={row.plannedLabour}
                                onChange={(e) => handleCellChange(index, "plannedLabour", e.target.value)}
                                disabled={readOnly}
                                className="h-9 bg-white/5 border-white/10 text-sm text-center"
                                min={0}
                            />
                            <Input
                                type="number"
                                placeholder="0"
                                value={row.actualLabour}
                                onChange={(e) => handleCellChange(index, "actualLabour", e.target.value)}
                                disabled={readOnly}
                                className="h-9 bg-white/5 border-white/10 text-sm text-center"
                                min={0}
                            />
                            <Input
                                type="text"
                                placeholder="Planned Work"
                                value={row.plannedWork}
                                onChange={(e) => handleCellChange(index, "plannedWork", e.target.value)}
                                disabled={readOnly}
                                className="h-9 bg-white/5 border-white/10 text-sm"
                            />
                            <Input
                                type="text"
                                placeholder="Actual Work"
                                value={row.actualWork}
                                onChange={(e) => handleCellChange(index, "actualWork", e.target.value)}
                                disabled={readOnly}
                                className="h-9 bg-white/5 border-white/10 text-sm"
                            />
                            {readOnly ? (
                                <Input type="text" value={row.status} disabled className="h-9 bg-white/5 border-white/10 text-sm" />
                            ) : (
                                <Select
                                    value={row.status}
                                    onValueChange={(value) => handleCellChange(index, "status", value)}
                                >
                                    <SelectTrigger className="h-9 bg-white/5 border-white/10 text-sm">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {!readOnly && rows.length > 1 && (
                                <motion.button type="button" onClick={() => removeRow(index)} className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                    <Trash2 className="w-4 h-4" />
                                </motion.button>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-[1.5fr,1fr,100px,100px,1fr,1fr,100px,40px] gap-2 p-3 bg-white/5 border-t border-white/10">
                    <div className="text-sm font-semibold text-foreground">Total</div>
                    <div></div>
                    <div className="text-sm font-semibold text-secondary text-center">
                        {rows.reduce((sum, r) => sum + (typeof r.plannedLabour === 'number' ? r.plannedLabour : 0), 0)}
                    </div>
                    <div className="text-sm font-semibold text-primary text-center">
                        {rows.reduce((sum, r) => sum + (typeof r.actualLabour === 'number' ? r.actualLabour : 0), 0)}
                    </div>
                    <div className="col-span-4"></div>
                </div>
            </div>
        </motion.div>
    );
};

export default DailyProgressTable;
