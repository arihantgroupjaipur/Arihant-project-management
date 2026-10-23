import { useEffect, useState } from "react";
import { PackageSearch, Loader2 } from "lucide-react";
import { getBoqCheck } from "@/services/procurementService";

const norm = (s) => String(s ?? '').trim().toLowerCase();

// Auto-checks the selected Task's BOM (from the BOQ/BOM Google Sheet) joined with current
// stock (from the IMS Google Sheet) — purely informational, never blocks Indent submission.
const BoqStockCheckPanel = ({ workParticulars }) => {
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!workParticulars) {
            setResult(null);
            setError(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        getBoqCheck(workParticulars)
            .then(setResult)
            .catch((err) => setError(err.message))
            .finally(() => setIsLoading(false));
    }, [workParticulars]);

    if (!workParticulars) return null;

    return (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
                <PackageSearch className="w-4 h-4 text-blue-400" />
                <p className="text-sm font-semibold text-foreground">BOQ / Stock Check for "{workParticulars}"</p>
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            {!isLoading && result && !result.matched && (
                <p className="text-xs text-muted-foreground">No BOQ/BOM found for this task in the linked sheet — nothing to check.</p>
            )}

            {!isLoading && result?.matched && (
                <>
                    {norm(result.matchedWorkName) !== norm(workParticulars) && (
                        <p className="text-xs text-yellow-400/90">Closest BOQ match: "{result.matchedWorkName}" (not an exact name match)</p>
                    )}
                    <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-muted-foreground uppercase border-b border-white/10">
                                <th className="text-left py-1.5 pr-4 font-medium">Item</th>
                                <th className="text-left py-1.5 pr-4 font-medium">Code</th>
                                <th className="text-left py-1.5 pr-4 font-medium">Unit</th>
                                <th className="text-left py-1.5 pr-4 font-medium">Required (per unit)</th>
                                <th className="text-left py-1.5 pr-4 font-medium">Current Stock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {result.bomItems.map((item, i) => {
                                const low = item.currentStock != null && Number(item.currentStock) < Number(item.requiredQtyPerUnit || 0);
                                return (
                                    <tr key={i}>
                                        <td className="py-1.5 pr-4 text-foreground/90">{item.itemName}</td>
                                        <td className="py-1.5 pr-4 text-muted-foreground">{item.itemCode}</td>
                                        <td className="py-1.5 pr-4 text-muted-foreground">{item.unit}</td>
                                        <td className="py-1.5 pr-4 text-foreground/90">{item.requiredQtyPerUnit}</td>
                                        <td className={`py-1.5 pr-4 font-medium ${low ? 'text-red-400' : 'text-green-400'}`}>
                                            {item.currentStock ?? '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default BoqStockCheckPanel;
