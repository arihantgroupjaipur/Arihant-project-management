import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { contractorService } from "@/services/contractorService";
import { workOrderService } from "@/services/workOrderService";
import { entryService } from "@/services/entryService";

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

    const handleCellChange = async (index, field, value) => {
        const newRows = [...rows];

        if (field === "workOrderNo") {
            newRows[index][field] = value;
            const selectedWO = workOrders.find(wo => wo.workOrderNumber === value);
            if (selectedWO) {
                try {
                    // Fetch historical usage
                    const usage = await entryService.getWorkOrderUsage(value);
                    const totalPlannedLabour = selectedWO.workItems?.reduce((sum, item) => sum + (item.plannedLabour || 0), 0) || 0;
                    const totalPlannedArea = selectedWO.workItems?.reduce((sum, item) => sum + (item.workArea || 0), 0) || 0;

                    // Subtract consumed labour and area
                    const remainingLabour = Math.max(0, totalPlannedLabour - (usage.totalConsumedLabour || 0));
                    const remainingArea = Math.max(0, totalPlannedArea - (usage.totalConsumedArea || 0));

                    newRows[index].plannedLabour = remainingLabour;
                    newRows[index].plannedWork = remainingArea > 0 ? remainingArea.toString() : "0";

                    // Notify parent to auto-fill main form fields
                    if (onWorkOrderSelect) {
                        onWorkOrderSelect(selectedWO);
                    }
                } catch (error) {
                    console.error("Failed to fetch work order usage", error);
                }
            } else {
                newRows[index].plannedLabour = 0;
                newRows[index].plannedWork = "";
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
                <div className="grid grid-cols-[2fr,2fr,120px,120px,1.5fr,1.5fr,120px,40px] gap-2 p-3 bg-white/5 border-b border-white/10">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contractor Name</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Order</div>
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
                        <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="grid grid-cols-[2fr,2fr,120px,120px,1.5fr,1.5fr,120px,40px] gap-2 p-2 hover:bg-white/5 transition-colors group">
                            {readOnly ? (
                                <Input type="text" value={row.contractorName} disabled className="h-9 bg-white/5 border-white/10 text-sm" />
                            ) : (
                                <div className="relative flex w-full items-stretch rounded-lg bg-black/20 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-primary/50">
                                    <input
                                        type="text"
                                        value={row.contractorName}
                                        onChange={(e) => handleCellChange(index, "contractorName", e.target.value)}
                                        placeholder="Type or select..."
                                        className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-foreground focus:outline-none text-sm h-9"
                                    />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button type="button" className="shrink-0 flex items-center justify-center px-2 border-l border-white/10 hover:bg-white/5 transition-colors group">
                                                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[200px] border-white/10 bg-[#1e1e2d] z-[9999] max-h-[300px] overflow-y-auto">
                                            {availableContractors.map((contractor) => (
                                                <DropdownMenuItem key={contractor._id} onClick={() => handleCellChange(index, "contractorName", contractor.name)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer text-sm">
                                                    {contractor.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
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
                                        <SelectItem value="none" className="text-muted-foreground italic">No Work Order</SelectItem>
                                        {workOrders.map((wo) => (
                                            <SelectItem key={wo._id} value={wo.workOrderNumber}>
                                                {wo.workOrderNumber} - {wo.addressLocation}
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
                                <div className="relative flex w-full items-stretch rounded-lg bg-black/20 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-primary/50">
                                    <input
                                        type="text"
                                        value={row.status}
                                        onChange={(e) => handleCellChange(index, "status", e.target.value)}
                                        placeholder="Status"
                                        className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-foreground focus:outline-none text-sm h-9"
                                    />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button type="button" className="shrink-0 flex items-center justify-center px-2 border-l border-white/10 hover:bg-white/5 transition-colors group">
                                                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[150px] border-white/10 bg-[#1e1e2d] z-[9999] max-h-[300px] overflow-y-auto">
                                            {statusOptions.map((status) => (
                                                <DropdownMenuItem key={status} onClick={() => handleCellChange(index, "status", status)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer text-sm">
                                                    {status}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
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
                <div className="grid grid-cols-[2fr,120px,120px,1.5fr,1.5fr,120px,40px] gap-2 p-3 bg-white/5 border-t border-white/10">
                    <div className="text-sm font-semibold text-foreground">Total</div>
                    <div className="text-sm font-semibold text-secondary text-center">
                        {rows.reduce((sum, r) => sum + (typeof r.plannedLabour === 'number' ? r.plannedLabour : 0), 0)}
                    </div>
                    <div className="text-sm font-semibold text-primary text-center">
                        {rows.reduce((sum, r) => sum + (typeof r.actualLabour === 'number' ? r.actualLabour : 0), 0)}
                    </div>
                    <div className="col-span-3"></div>
                </div>
            </div>
        </motion.div>
    );
};

export default DailyProgressTable;
