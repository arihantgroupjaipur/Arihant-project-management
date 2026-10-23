import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Handshake, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getNegotiations, createNegotiation } from "@/services/procurementService";

// Negotiation history for a Purchase Order — only meaningful once the PO exists (has an _id)
const NegotiationLogPanel = ({ purchaseOrderId, vendorName }) => {
    const [offerAmount, setOfferAmount] = useState("");
    const [counterOfferAmount, setCounterOfferAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const queryClient = useQueryClient();

    const { data: rounds = [] } = useQuery({
        queryKey: ["negotiations", purchaseOrderId],
        queryFn: () => getNegotiations(purchaseOrderId),
        enabled: !!purchaseOrderId,
    });

    const handleAddRound = async () => {
        if (!offerAmount && !counterOfferAmount && !notes.trim()) {
            toast.error("Add at least an amount or a note for this round");
            return;
        }
        setIsSaving(true);
        try {
            await createNegotiation({
                purchaseOrderReference: purchaseOrderId,
                vendorName,
                offerAmount: offerAmount ? Number(offerAmount) : undefined,
                counterOfferAmount: counterOfferAmount ? Number(counterOfferAmount) : undefined,
                notes,
            });
            setOfferAmount(""); setCounterOfferAmount(""); setNotes("");
            queryClient.invalidateQueries({ queryKey: ["negotiations", purchaseOrderId] });
            toast.success("Negotiation round saved");
        } catch (error) {
            toast.error(error.message || "Failed to save negotiation round");
        } finally {
            setIsSaving(false);
        }
    };

    if (!purchaseOrderId) return null;

    return (
        <div className="space-y-4 lg:col-span-3 mt-4 border-t border-white/10 pt-6">
            <h4 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <Handshake className="w-4 h-4" /> Negotiation Log
            </h4>

            {rounds.length > 0 && (
                <div className="space-y-2">
                    {rounds.map((r) => (
                        <div key={r._id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
                            <div className="flex justify-between items-baseline">
                                <span className="font-semibold text-foreground">Round {r.round}</span>
                                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {r.offerAmount != null && <>Offer: ₹{Number(r.offerAmount).toLocaleString('en-IN')} </>}
                                {r.counterOfferAmount != null && <>· Counter: ₹{Number(r.counterOfferAmount).toLocaleString('en-IN')}</>}
                            </div>
                            {r.notes && <p className="text-foreground/80 mt-1">{r.notes}</p>}
                        </div>
                    ))}
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-3">
                <input
                    type="number"
                    placeholder="Vendor offer (₹)"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                    type="number"
                    placeholder="Our counter-offer (₹)"
                    value={counterOfferAmount}
                    onChange={(e) => setCounterOfferAmount(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                    type="text"
                    placeholder="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>
            <button
                type="button"
                onClick={handleAddRound}
                disabled={isSaving}
                className="flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
            >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Negotiation Round
            </button>
        </div>
    );
};

export default NegotiationLogPanel;
