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
import { workOrderService } from "@/services/workOrderService";

const MaterialConsumptionTable = ({ rows, onChange, readOnly = false }) => {
    const [workOrders, setWorkOrders] = useState([]);
    const units = [
        "kg",
        "m",
        "m²",
        "m³",
        "nos",
        "set",
        "bag",
        "box",
        "ltr",
        "bundle",
        "roll",
        "ton"
    ];

    useEffect(() => {
        const fetchWorkOrders = async () => {
            try {
                const data = await workOrderService.getAllWorkOrders();
                setWorkOrders(data);
            } catch (error) {
                console.error("Failed to fetch work orders", error);
            }
        };
        fetchWorkOrders();
    }, []);
    // Auto-add row when last row is filled
    useEffect(() => {
        if (readOnly) return;

        const lastRow = rows[rows.length - 1];
        const isLastRowFilled =
            lastRow.materialName !== "" &&
            (lastRow.totalQuantity !== "" && lastRow.totalQuantity >= 0) &&
            lastRow.unit !== "";

        if (isLastRowFilled) {
            onChange([...rows, { materialName: "", totalQuantity: "", unit: "", workOrderReference: "" }]);
        }
    }, [rows, readOnly, onChange]);

    const handleCellChange = (index, field, value) => {
        const newRows = [...rows];
        if (field === "totalQuantity") {
            newRows[index][field] = value === "" ? "" : parseFloat(value) || 0;
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
                <label className="text-sm font-medium text-foreground">Material Consumption</label>
            </div>

            <div className="glass-card overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[2fr,150px,150px,40px] gap-2 p-3 bg-white/5 border-b border-white/10">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Material Name</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Total Quantity</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Unit</div>
                    <div></div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-white/5">
                    {rows.map((row, index) => (
                        <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="grid grid-cols-[2fr,150px,150px,40px] gap-2 p-2 hover:bg-white/5 transition-colors group">
                            <Input
                                type="text"
                                placeholder="Material Name"
                                value={row.materialName}
                                onChange={(e) => handleCellChange(index, "materialName", e.target.value)}
                                disabled={readOnly}
                                className="h-9 bg-white/5 border-white/10 text-sm"
                            />
                            <Input
                                type="number"
                                placeholder="0"
                                value={row.totalQuantity}
                                onChange={(e) => handleCellChange(index, "totalQuantity", e.target.value)}
                                disabled={readOnly}
                                className="h-9 bg-white/5 border-white/10 text-sm text-center"
                                step="0.01"
                                min={0}
                            />
                            {readOnly ? (
                                <Input type="text" value={row.unit} disabled className="h-9 bg-white/5 border-white/10 text-sm text-center" />
                            ) : (
                                <Select
                                    value={row.unit}
                                    onValueChange={(value) => handleCellChange(index, "unit", value)}
                                >
                                    <SelectTrigger className="h-9 bg-white/5 border-white/10 text-sm text-center">
                                        <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map((unit) => (
                                            <SelectItem key={unit} value={unit}>
                                                {unit}
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
            </div>
        </motion.div>
    );
};

export default MaterialConsumptionTable;
