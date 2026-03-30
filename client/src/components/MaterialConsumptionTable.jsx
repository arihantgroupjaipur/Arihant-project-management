import { useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const units = ["kg", "m", "m²", "m³", "nos", "set", "bag", "box", "ltr", "bundle", "roll", "ton"];

// Color logic: 0 → green, deviation → yellow (minor) or red (significant)
const getDiffColor = (diff, type = "qty") => {
    if (diff === null || diff === undefined || isNaN(diff)) return "";
    if (diff === 0) return "text-green-400";
    if (type === "qty") {
        // over-consumed → red, under-consumed → yellow
        return diff > 0 ? "text-red-400 font-semibold" : "text-yellow-400";
    } else {
        // work area: actual > planned → red, actual < planned → yellow
        return diff > 0 ? "text-red-400 font-semibold" : "text-yellow-400";
    }
};

const getDiffBg = (diff) => {
    if (diff === null || isNaN(diff) || diff === 0) return "";
    return diff > 0 ? "bg-red-500/10" : "bg-yellow-500/10";
};

const calcDiff = (a, b) => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (isNaN(na) || isNaN(nb)) return null;
    return parseFloat((na - nb).toFixed(4));
};

const MaterialConsumptionTable = ({ rows, onChange, readOnly = false }) => {
    // Auto-add row when last row is filled
    useEffect(() => {
        if (readOnly) return;
        const lastRow = rows[rows.length - 1];
        const isLastRowFilled =
            lastRow.materialName !== "" &&
            (lastRow.totalQuantity !== "" && lastRow.totalQuantity >= 0) &&
            lastRow.unit !== "";
        if (isLastRowFilled) {
            onChange([...rows, { materialName: "", totalQuantity: "", usedTotalQty: "", unit: "", workOrderReference: "", plannedWorkArea: "", actualWorkArea: "" }]);
        }
    }, [rows, readOnly, onChange]);

    const handleCellChange = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        onChange(newRows);
    };

    const removeRow = (index) => {
        if (rows.length > 1) onChange(rows.filter((_, i) => i !== index));
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
            <label className="text-sm font-medium text-foreground">Material Consumption</label>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                <th className="p-3 text-left">Material Name</th>
                                <th className="p-3 text-center">Total Qty</th>
                                <th className="p-3 text-center">Used Total Qty</th>
                                <th className="p-3 text-center">Diff of Qty</th>
                                <th className="p-3 text-center">Unit</th>
                                <th className="p-3 text-center">Planned Work Area</th>
                                <th className="p-3 text-center">Actual Work Area</th>
                                <th className="p-3 text-center">Diff in Work Area</th>
                                {!readOnly && <th className="p-3 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {rows.map((row, index) => {
                                const diffQty = calcDiff(row.usedTotalQty, row.totalQuantity);
                                const diffArea = calcDiff(row.actualWorkArea, row.plannedWorkArea);
                                return (
                                    <motion.tr
                                        key={index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.04 }}
                                        className="hover:bg-white/5 transition-colors group"
                                    >
                                        <td className="p-2">
                                            <Input
                                                type="text"
                                                placeholder="Material Name"
                                                value={row.materialName}
                                                onChange={(e) => handleCellChange(index, "materialName", e.target.value)}
                                                disabled={readOnly}
                                                className="h-9 bg-white/5 border-white/10 text-sm"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={row.totalQuantity}
                                                onChange={(e) => handleCellChange(index, "totalQuantity", e.target.value)}
                                                disabled={readOnly}
                                                className="h-9 bg-white/5 border-white/10 text-sm text-center"
                                                step="any" min={0}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={row.usedTotalQty}
                                                onChange={(e) => handleCellChange(index, "usedTotalQty", e.target.value)}
                                                disabled={readOnly}
                                                className="h-9 bg-white/5 border-white/10 text-sm text-center"
                                                step="any" min={0}
                                            />
                                        </td>
                                        <td className={`p-2 text-center font-mono rounded ${getDiffBg(diffQty)}`}>
                                            <span className={getDiffColor(diffQty, "qty")}>
                                                {diffQty !== null ? (diffQty > 0 ? `+${diffQty}` : diffQty) : "—"}
                                            </span>
                                        </td>
                                        <td className="p-2">
                                            {readOnly ? (
                                                <Input type="text" value={row.unit} disabled className="h-9 bg-white/5 border-white/10 text-sm text-center" />
                                            ) : (
                                                <Select value={row.unit} onValueChange={(v) => handleCellChange(index, "unit", v)}>
                                                    <SelectTrigger className="h-9 bg-white/5 border-white/10 text-sm">
                                                        <SelectValue placeholder="Unit" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={row.plannedWorkArea}
                                                onChange={(e) => handleCellChange(index, "plannedWorkArea", e.target.value)}
                                                disabled={readOnly}
                                                className="h-9 bg-white/5 border-white/10 text-sm text-center"
                                                step="any" min={0}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={row.actualWorkArea}
                                                onChange={(e) => handleCellChange(index, "actualWorkArea", e.target.value)}
                                                disabled={readOnly}
                                                className="h-9 bg-white/5 border-white/10 text-sm text-center"
                                                step="any" min={0}
                                            />
                                        </td>
                                        <td className={`p-2 text-center font-mono rounded ${getDiffBg(diffArea)}`}>
                                            <span className={getDiffColor(diffArea, "area")}>
                                                {diffArea !== null ? (diffArea > 0 ? `+${diffArea}` : diffArea) : "—"}
                                            </span>
                                        </td>
                                        {!readOnly && (
                                            <td className="p-2">
                                                {rows.length > 1 && (
                                                    <motion.button
                                                        type="button"
                                                        onClick={() => removeRow(index)}
                                                        className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </motion.button>
                                                )}
                                            </td>
                                        )}
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-white/10 bg-white/[0.02] text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400/70 inline-block"></span>On target</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70 inline-block"></span>Under planned</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400/70 inline-block"></span>Over planned</span>
                </div>
            </div>
        </motion.div>
    );
};

export default MaterialConsumptionTable;
