import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import SignaturePad from "@/components/SignaturePad";
import workOrderService from "@/services/workOrderService";

const WorkOrder = () => {
    const navigate = useNavigate();
    const contractorSigRef = useRef(null);
    const engineerSigRef = useRef(null);
    const supervisorSigRef = useRef(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        workOrderNumber: "",
        mainWorkOrderReference: "",
        addressLocation: "",
        contactPersonName: "",
        workLocationName: "",
        storeKeeperSupervisorName: "",
    });

    const [workItems, setWorkItems] = useState([
        {
            workDescription: "",
            plannedLabour: "",
            workStartDate: "",
            workFinishDate: "",
            workArea: "",
            rate: "",
            totalAmount: "",
        },
    ]);

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleWorkItemChange = (index, field, value) => {
        const updatedItems = [...workItems];
        updatedItems[index][field] = value;

        // Auto-calculate total amount if rate and area are filled
        if (field === 'rate' || field === 'workArea') {
            const rate = parseFloat(updatedItems[index].rate) || 0;
            const area = parseFloat(updatedItems[index].workArea) || 0;
            updatedItems[index].totalAmount = (rate * area).toString();
        }

        setWorkItems(updatedItems);
    };

    const addWorkItem = () => {
        setWorkItems([
            ...workItems,
            {
                workDescription: "",
                plannedLabour: "",
                workStartDate: "",
                workFinishDate: "",
                workArea: "",
                rate: "",
                totalAmount: "",
            },
        ]);
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const removeWorkItem = (index) => {
        if (workItems.length > 1) {
            setWorkItems(workItems.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.workOrderNumber) {
            toast.error("Work Order Number is required");
            return;
        }
        if (!formData.addressLocation) {
            toast.error("Address/Location is required");
            return;
        }
        if (!formData.contactPersonName) {
            toast.error("Contact Person Name is required");
            return;
        }
        if (!formData.workLocationName) {
            toast.error("Work Location Name is required");
            return;
        }

        // Validate work items
        if (workItems.length === 0) {
            toast.error("At least one work item is required");
            return;
        }

        for (let i = 0; i < workItems.length; i++) {
            const item = workItems[i];
            if (!item.workDescription || !item.plannedLabour || !item.workStartDate ||
                !item.workFinishDate || !item.workArea || !item.rate) {
                toast.error(`Please fill all fields in work item ${i + 1}`);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // Get signature data
            const signatures = {
                contractor: contractorSigRef.current?.isEmpty() ? null : contractorSigRef.current?.toDataURL(),
                engineer: engineerSigRef.current?.isEmpty() ? null : engineerSigRef.current?.toDataURL(),
                supervisor: supervisorSigRef.current?.isEmpty() ? null : supervisorSigRef.current?.toDataURL(),
            };

            const workOrderData = {
                ...formData,
                workItems,
                signatures,
            };

            await workOrderService.createWorkOrder(workOrderData);
            toast.success("Work Order created successfully!");
            navigate("/");
        } catch (error) {
            console.error("Error creating work order:", error);
            toast.error(error.response?.data?.message || "Failed to create work order");
        } finally {
            setIsSubmitting(false);
        }
    };



    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            <BackgroundOrbs />

            <div className="relative z-10 min-h-screen p-4 md:p-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-6"
                >
                    <motion.button
                        onClick={() => navigate("/")}
                        className="glass-card p-3 hover:bg-white/10 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </motion.button>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        Work <span className="text-gradient-primary">Order</span>
                    </h1>
                </motion.div>

                {/* Form Container */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="max-w-6xl mx-auto"
                >
                    <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-6">
                        {/* Company Header */}
                        <div className="border-b border-white/10 pb-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <img src="/arihantlogo.png" alt="Arihant Logo" className="h-12 w-12 object-contain" />
                                <h2 className="text-xl md:text-2xl font-bold text-center flex-1">
                                    Arihant Dream Infra Projects Ltd. Jaipur
                                </h2>
                            </div>
                            <div className="text-center space-y-1 text-xs md:text-sm text-muted-foreground">
                                <p>2nd Floor, Class Of Pearl, Income Tax Colony, Tonk Road, Durgapura, Jaipur, Rajasthan, 302018 (Pan - AAICA5226A)</p>
                                <p>CIN No. U7010RJ2011PLC035322</p>
                            </div>
                            <h3 className="text-xl font-bold text-center mt-4 mb-6">Work Order</h3>

                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Website: www.arihantgroupjaipur.com</p>
                                    <p className="text-muted-foreground">Email: info@arihantgroupjaipur.com - Legacy@arihantgroupjaipur.com</p>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-muted-foreground block mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => handleInputChange("date", e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-muted-foreground block mb-1">Work Order Number</label>
                                        <input
                                            type="text"
                                            value={formData.workOrderNumber}
                                            onChange={(e) => handleInputChange("workOrderNumber", e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                            placeholder="Enter work order number"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-2">
                                    Main Work Order Reference
                                </label>
                                <input
                                    type="text"
                                    value={formData.mainWorkOrderReference}
                                    onChange={(e) => handleInputChange("mainWorkOrderReference", e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="Enter main work order reference"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-2">
                                    Address/Location
                                </label>
                                <input
                                    type="text"
                                    value={formData.addressLocation}
                                    onChange={(e) => handleInputChange("addressLocation", e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="Enter address/location"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-2">
                                    Contact Person Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.contactPersonName}
                                    onChange={(e) => handleInputChange("contactPersonName", e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="Enter contact person name"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-2">
                                    Work Location Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.workLocationName}
                                    onChange={(e) => handleInputChange("workLocationName", e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="Enter work location name"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-2">
                                    Store Keeper & Supervisor Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.storeKeeperSupervisorName}
                                    onChange={(e) => handleInputChange("storeKeeperSupervisorName", e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="Enter store keeper & supervisor name"
                                />
                            </div>
                        </div>

                        {/* Work Items Table */}
                        <div className="border-t border-white/10 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Work Details</h3>
                                <motion.button
                                    type="button"
                                    onClick={addWorkItem}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Row
                                </motion.button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left p-2 text-muted-foreground font-medium">Work Description</th>
                                            <th className="text-left p-2 text-muted-foreground font-medium">No Of Planned Labour</th>
                                            <th className="text-left p-2 text-muted-foreground font-medium">Work Start Date</th>
                                            <th className="text-left p-2 text-muted-foreground font-medium">Work Finish Date</th>
                                            <th className="text-left p-2 text-muted-foreground font-medium">Work Area</th>
                                            <th className="text-left p-2 text-muted-foreground font-medium">Rate</th>
                                            <th className="text-left p-2 text-muted-foreground font-medium">Total Amount</th>
                                            <th className="text-left p-2 text-muted-foreground font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workItems.map((item, index) => (
                                            <tr key={index} className="border-b border-white/5">
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        value={item.workDescription}
                                                        onChange={(e) => handleWorkItemChange(index, "workDescription", e.target.value)}
                                                        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                        placeholder="Description"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={item.plannedLabour}
                                                        onChange={(e) => handleWorkItemChange(index, "plannedLabour", e.target.value)}
                                                        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                        placeholder="Labour"
                                                        min="0"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="date"
                                                        value={item.workStartDate}
                                                        onChange={(e) => handleWorkItemChange(index, "workStartDate", e.target.value)}
                                                        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="date"
                                                        value={item.workFinishDate}
                                                        onChange={(e) => handleWorkItemChange(index, "workFinishDate", e.target.value)}
                                                        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={item.workArea}
                                                        onChange={(e) => handleWorkItemChange(index, "workArea", e.target.value)}
                                                        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                        placeholder="Area"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={item.rate}
                                                        onChange={(e) => handleWorkItemChange(index, "rate", e.target.value)}
                                                        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                        placeholder="Rate"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={item.totalAmount}
                                                        readOnly
                                                        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground opacity-60"
                                                        placeholder="Auto"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeWorkItem(index)}
                                                        disabled={workItems.length === 1}
                                                        className="p-1 text-red-400 hover:bg-red-500/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signature Section */}
                        <div className="border-t border-white/10 pt-6 mt-6">
                            <h3 className="text-lg font-semibold mb-4">Signatures</h3>
                            <div className="grid md:grid-cols-3 gap-6">
                                <SignaturePad ref={contractorSigRef} label="Signature Of Contractor" />
                                <SignaturePad ref={engineerSigRef} label="Signature Of Site Engineer" />
                                <SignaturePad ref={supervisorSigRef} label="Signature Of Site Supervisor" />
                            </div>
                        </div>

                        {/* Note */}
                        <div className="border-t border-white/10 pt-4">
                            <p className="text-xs text-muted-foreground italic">
                                अतिरिक्त नोट : 1. बिल जमा करते समय कार्य आदेश (Work Order) की प्रति संलग्न करना आवश्यक है। 2.
                                कार्य में किसी भी प्रकार की त्रुटि का दायित्व ठेकेदार का है और सुधार का कार्य करना है। 3. कार्य का वर्क आर्डर के अनुसार
                                गुणवत्ता मानक के अनुसार करना है। 4. हाउसकीपिंग और सफाई का कार्य करना है।
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4 mt-6">
                            <motion.button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-xl font-semibold bg-purple-500 text-white hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                                whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Work Order"
                                )}
                            </motion.button>
                            <motion.button
                                type="button"
                                onClick={() => navigate("/")}
                                className="px-8 py-3 rounded-xl font-semibold glass-card hover:bg-white/10 transition-all"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Cancel
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default WorkOrder;
