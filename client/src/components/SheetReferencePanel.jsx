import { useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { toast } from "sonner";

// Generic read-only search panel over a Google Sheet (BOQ/BOM or IMS) — renders whatever
// columns the sheet actually has, since we don't hardcode a fixed column layout.
const SheetReferencePanel = ({ title, placeholder, fetchRows, initialQuery = "" }) => {
    const [query, setQuery] = useState(initialQuery);
    const [rows, setRows] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const runSearch = async (q = query) => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            const result = await fetchRows(q);
            setRows(result);
        } catch (error) {
            toast.error(error.message || `Failed to load ${title}`);
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];

    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                    placeholder={placeholder}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                    onClick={() => runSearch()}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search
                </button>
                {rows && (
                    <button onClick={() => { setRows(null); setHasSearched(false); setQuery(""); }} className="text-muted-foreground hover:text-foreground p-2">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {hasSearched && !isLoading && (
                rows.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No matching rows found in {title}.</p>
                ) : (
                    <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-muted-foreground uppercase border-b border-white/10">
                                    {columns.map((c) => (
                                        <th key={c} className="text-left py-1.5 pr-4 font-medium whitespace-nowrap">{c}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {rows.map((row, i) => (
                                    <tr key={i}>
                                        {columns.map((c) => (
                                            <td key={c} className="py-1.5 pr-4 whitespace-nowrap text-foreground/90">{row[c]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
};

export default SheetReferencePanel;
