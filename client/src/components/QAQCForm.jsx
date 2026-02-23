import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import SignaturePad from "@/components/SignaturePad";
import { createQAQCEntry } from "@/services/qaqcService";
import FloatingInput from "@/components/FloatingInput";

const QAQCForm = ({ onSuccess }) => {
    const contractorSigRef = useRef(null);
    const engineerSigRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        projectName: "",
        location: "",
        contractorName: "",
    });

    const [checklistItems, setChecklistItems] = useState([
        { description: "", status: "Pending", remarks: "" }
    ]);

    const handleinputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...checklistItems];
        newItems[index][field] = value;
        setChecklistItems(newItems);
    };

    const addItem = () => {
        setChecklistItems([...checklistItems, { description: "", status: "Pending", remarks: "" }]);
    };

    const removeItem = (index) => {
        if (checklistItems.length > 1) {
            setChecklistItems(checklistItems.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.projectName || !formData.location || !formData.contractorName) {
            toast.error("Please fill all required fields");
            return;
        }

        if (checklistItems.some(item => !item.description)) {
            toast.error("All checklist items must have a description");
            return;
        }

        setIsSubmitting(true);
        try {
            const signatures = {
                contractor: contractorSigRef.current?.isEmpty() ? null : contractorSigRef.current?.toDataURL(),
                engineer: engineerSigRef.current?.isEmpty() ? null : engineerSigRef.current?.toDataURL(),
            };

            await createQAQCEntry({ ...formData, checklistItems, signatures });
            toast.success("QA/QC Report submitted successfully");
            onSuccess && onSuccess();

            // Reset form
            setFormData({
                date: new Date().toISOString().split('T')[0],
                projectName: "",
                location: "",
                contractorName: "",
            });
            setChecklistItems([{ description: "", status: "Pending", remarks: "" }]);
            contractorSigRef.current?.clear();
            engineerSigRef.current?.clear();

        } catch (error) {
            console.error(error);
            toast.error("Failed to submit QA/QC Report");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">QA/QC Inspection Report</h2>

            <div className="grid md:grid-cols-2 gap-4">
                <FloatingInput type="date" label="Date" value={formData.date} onChange={(e) => handleinputChange("date", e.target.value)} />
                <FloatingInput type="text" label="Project Name" value={formData.projectName} onChange={(e) => handleinputChange("projectName", e.target.value)} />
                <FloatingInput type="text" label="Location" value={formData.location} onChange={(e) => handleinputChange("location", e.target.value)} />
                <FloatingInput type="text" label="Contractor Name" value={formData.contractorName} onChange={(e) => handleinputChange("contractorName", e.target.value)} />
            </div>

            <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-foreground">Checklist Items</h3>
                    <button type="button" onClick={addItem} className="text-sm bg-primary/20 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/30 transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Item
                    </button>
                </div>

                <div className="space-y-3">
                    {checklistItems.map((item, index) => (
                        <div key={index} className="grid md:grid-cols-12 gap-2 items-start bg-white/5 p-3 rounded-lg">
                            <div className="md:col-span-5">
                                <input
                                    type="text"
                                    placeholder="Description of work/item"
                                    className="w-full bg-transparent border-b border-white/10 focus:border-primary outline-none py-1 text-sm text-foreground placeholder:text-muted-foreground"
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <select
                                    className="w-full bg-black/20 border border-white/10 rounded-md py-1 px-2 text-sm text-foreground outline-none focus:border-primary"
                                    value={item.status}
                                    onChange={(e) => handleItemChange(index, "status", e.target.value)}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Pass">Pass</option>
                                    <option value="Fail">Fail</option>
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <input
                                    type="text"
                                    placeholder="Remarks"
                                    className="w-full bg-transparent border-b border-white/10 focus:border-primary outline-none py-1 text-sm text-foreground placeholder:text-muted-foreground"
                                    value={item.remarks}
                                    onChange={(e) => handleItemChange(index, "remarks", e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                                <button type="button" onClick={() => removeItem(index)} disabled={checklistItems.length === 1} className="text-red-400 p-1 hover:bg-red-500/10 rounded disabled:opacity-30">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
                <SignaturePad ref={contractorSigRef} label="Contractor Signature" />
                <SignaturePad ref={engineerSigRef} label="Engineer Signature" />
            </div>

            <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}
            >
                {isSubmitting ? "Submitting..." : "Submit QA/QC Report"}
            </motion.button>
        </form>
    );
};

export default QAQCForm;
