import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ClipboardCheck, Calendar, Building, User, FileText, Sheet, File, CheckCircle2, Image as ImageIcon, X, Eye, Trash2, Loader2, Edit, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workCompletionService } from "@/services/workCompletionService";
import { uploadService } from "@/services/uploadService";
import FileUploadSelector from "./FileUploadSelector";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateWorkCompletionPDF } from "@/utils/workCompletionPdfExport";
import { generateWorkCompletionExcel } from "@/utils/workCompletionExcelExport";
import { generateWorkCompletionCSV } from "@/utils/workCompletionCsvExport";

const WorkCompletionsList = ({ workCompletions, onRefresh, isAdmin, onEdit, onDelete, onCreateNew }) => {
    const [expandedId, setExpandedId] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadingId, setUploadingId] = useState(null);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handleExport = async (type, completion, e) => {
        e.stopPropagation();
        const exportType = type.toUpperCase();

        try {
            if (type === 'pdf') {
                await generateWorkCompletionPDF(completion);
                toast.success(`Certification PDF downloaded successfully!`);
            } else if (type === 'xlsx') {
                generateWorkCompletionExcel(completion);
                toast.success(`Certification Excel file downloaded successfully!`);
            } else if (type === 'csv') {
                generateWorkCompletionCSV(completion);
                toast.success(`Certification CSV file downloaded successfully!`);
            }
        } catch (error) {
            console.error(`${exportType} export error:`, error);
            toast.error(`Failed to generate ${exportType} file`);
        }
    };

    const handleFileUpload = async (completion, file) => {
        if (!file) return;
        setUploadingId(completion._id);

        try {
            toast.info(`Uploading document for WO #${completion.workOrderNumber}...`);
            const uploadResult = await uploadService.uploadImage(file);

            await workCompletionService.updateWorkCompletion(completion._id, {
                uploadedPdf: uploadResult.key
            });

            toast.success("Certification document uploaded successfully!");
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload document");
        } finally {
            setUploadingId(null);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        if (isNaN(d)) return 'N/A';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getChecklistStatus = (checklist) => {
        const values = Object.values(checklist || {});
        const completed = values.filter(Boolean).length;
        const total = values.length;
        return { completed, total };
    };

    const renderChecklistSection = (title, data, sectionKey, iconColor, completion) => {
        const status = getChecklistStatus(data);
        const Icon = CheckCircle2;

        return (
            <div className="glass-card p-4">
                <h5 className="font-medium mb-2 text-sm flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                    {title} ({status.completed}/{status.total})
                </h5>
                <div className="space-y-2 text-sm">
                    {Object.entries(data || {}).map(([key, value]) => {
                        const imageKey = `${sectionKey}_${key}`;
                        const hasImage = !value && completion.checklistImages && completion.checklistImages[imageKey];

                        return (
                            <div key={key} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-sm ${value ? 'bg-green-500' : 'bg-gray-500'}`} />
                                    <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{key}</span>
                                </div>
                                {hasImage && (
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                const s3Key = completion.checklistImages[imageKey];
                                                const url = await uploadService.getSignedUrl(s3Key);
                                                // Check if the key looks like an image
                                                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(s3Key);
                                                if (isImage) {
                                                    setSelectedImage(url);
                                                } else {
                                                    window.open(url, '_blank');
                                                }
                                            } catch (err) {
                                                console.error('Failed to get signed URL', err);
                                                toast.error('Failed to open file');
                                            }
                                        }}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded transition-colors text-xs font-medium border border-orange-500/20"
                                        title="View Proof"
                                    >
                                        <Eye className="w-3 h-3" />
                                        View
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (!workCompletions || workCompletions.length === 0) {
        return (
            <div className="text-center py-12">
                <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-orange-400/50" />
                <h3 className="text-xl font-semibold mb-2">No Work Certifications Yet</h3>
                <p className="text-muted-foreground mb-6">Create your first work completion certification to get started</p>
                <motion.button
                    onClick={() => onCreateNew ? onCreateNew() : navigate('/certification')}
                    className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Create New Certification
                </motion.button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Work Completion Certifications</h2>
                    <p className="text-muted-foreground">Manage all quality control certifications</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input type="text" placeholder="Search WO#, block, contractor, engineer…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-full sm:w-64" />
                    </div>
                    <motion.button
                        onClick={() => onCreateNew ? onCreateNew() : navigate('/certification')}
                        className="bg-orange-500 text-white px-4 py-2 rounded-xl font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ClipboardCheck className="w-4 h-4" />
                        New Certification
                    </motion.button>
                </div>
            </div>

            {(() => {
                const q = searchQuery.toLowerCase();
                const filtered = workCompletions.filter(completion => {
                    return !q ||
                        completion.workOrderNumber?.toLowerCase().includes(q) ||
                        completion.blockTower?.toLowerCase().includes(q) ||
                        completion.contractorName?.toLowerCase().includes(q) ||
                        completion.engineerName?.toLowerCase().includes(q);
                });

                if (filtered.length === 0) {
                    return <div className="text-center py-8 text-muted-foreground glass-card rounded-xl">No certifications match your search.</div>;
                }

                return filtered.map((completion) => {
                    const preWorkStatus = getChecklistStatus(completion.preWorkChecklist);
                    const duringWorkStatus = getChecklistStatus(completion.duringWorkChecklist);
                    const postWorkStatus = getChecklistStatus(completion.postWorkChecklist);

                    return (
                        <motion.div
                            key={completion._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedId(expandedId === completion._id ? null : completion._id)}
                                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                        <ClipboardCheck className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-medium text-foreground">WO #{completion.workOrderNumber}</h4>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(completion.date)}
                                            <Building className="w-3 h-3 ml-2" />
                                            {completion.blockTower}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Export buttons - shown when expanded */}
                                    {expandedId === completion._id && (
                                        <div className="flex items-center gap-2 mr-2" onClick={(e) => e.stopPropagation()}>
                                            {isAdmin && onEdit && (
                                                <motion.button
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEdit(completion);
                                                    }}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 transition-colors"
                                                    title="Edit Certification"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">Edit</span>
                                                </motion.button>
                                            )}

                                            {isAdmin && onDelete && (
                                                <motion.button
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(completion);
                                                    }}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors"
                                                    title="Delete Certification"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">Delete</span>
                                                </motion.button>
                                            )}

                                            <div className="flex items-center" onClick={e => e.stopPropagation()}>
                                                {(!completion.uploadedPdf || isAdmin) && (
                                                    <FileUploadSelector
                                                        accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png"
                                                        onFileSelect={(file) => handleFileUpload(completion, file)}
                                                        title="Upload Original Certification Document"
                                                    >
                                                        <motion.button
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            disabled={uploadingId === completion._id}
                                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors border border-white/5 ${completion.uploadedPdf ? 'text-primary' : 'text-foreground'}`}
                                                            title={completion.uploadedPdf ? "Replace Document" : "Upload Document"}
                                                        >
                                                            {uploadingId === completion._id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <UploadCloud className="w-3.5 h-3.5" />
                                                            )}
                                                            <span className="text-xs font-medium">{completion.uploadedPdf ? 'Replace' : 'Upload'}</span>
                                                        </motion.button>
                                                    </FileUploadSelector>
                                                )}

                                                {completion.uploadedPdf && (
                                                    <motion.button
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                const url = await uploadService.getSignedUrl(completion.uploadedPdf);
                                                                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(completion.uploadedPdf);
                                                                if (isImage) {
                                                                    setSelectedImage(url);
                                                                } else {
                                                                    window.open(url, '_blank');
                                                                }
                                                            } catch (err) {
                                                                console.error('Failed to view file', err);
                                                                toast.error('Failed to retrieve file URL');
                                                            }
                                                        }}
                                                        className="ml-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
                                                        title="View Uploaded Document"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-medium">View</span>
                                                    </motion.button>
                                                )}

                                                {completion.uploadedPdf && isAdmin && (
                                                    <motion.button
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            workCompletionService.updateWorkCompletion(completion._id, { uploadedPdf: null })
                                                                .then(() => toast.success("Document removed"))
                                                                .then(() => onRefresh && onRefresh())
                                                                .catch((err) => toast.error("Failed to remove document"));
                                                        }}
                                                        className="ml-1 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                                                        title="Delete Document"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </motion.button>
                                                )}
                                            </div>

                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                onClick={(e) => handleExport('pdf', completion, e)}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                                                title="Export as PDF"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">PDF</span>
                                            </motion.button>

                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.05 }}
                                                onClick={(e) => handleExport('xlsx', completion, e)}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                                                title="Export as Excel"
                                            >
                                                <Sheet className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">XLS</span>
                                            </motion.button>

                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.1 }}
                                                onClick={(e) => handleExport('csv', completion, e)}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                                                title="Export as CSV"
                                            >
                                                <File className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">CSV</span>
                                            </motion.button>
                                        </div>
                                    )}
                                    <motion.div
                                        animate={{ rotate: expandedId === completion._id ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                    </motion.div>
                                </div>
                            </button>

                            <AnimatePresence>
                                {expandedId === completion._id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="border-t border-white/10"
                                    >
                                        <div className="p-6 space-y-6">
                                            {/* Basic Info */}
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">Block/Tower</p>
                                                    <p className="font-medium">{completion.blockTower}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">Floor/Zone/Unit</p>
                                                    <p className="font-medium">{completion.floorZoneUnit}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">Work Trade</p>
                                                    <p className="font-medium">{completion.workTrade}</p>
                                                </div>
                                            </div>

                                            {/* Personnel & Contract */}
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">Contractor Name</p>
                                                    <p className="font-medium">{completion.contractorName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">Engineer Name</p>
                                                    <p className="font-medium">{completion.engineerName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">Bill No.</p>
                                                    <p className="font-medium">{completion.billNo || 'N/A'}</p>
                                                </div>
                                            </div>

                                            {/* Dates */}
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">Work Start Date</p>
                                                    <p className="font-medium">{formatDate(completion.workStartDate)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">Work End Date</p>
                                                    <p className="font-medium">{formatDate(completion.workEndDate)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">Total Duration</p>
                                                    <p className="font-medium">{completion.totalWorkDuration || 'N/A'}</p>
                                                </div>
                                            </div>

                                            {/* Work Execution Summary */}
                                            {completion.workExecutionRows && completion.workExecutionRows.length > 0 && (
                                                <div className="mt-6">
                                                    <h4 className="font-semibold mb-3">Work Execution Summary</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="border-b border-white/10">
                                                                    <th className="text-left p-2 text-muted-foreground font-medium">Summary</th>
                                                                    <th className="text-left p-2 text-muted-foreground font-medium">Start Date</th>
                                                                    <th className="text-left p-2 text-muted-foreground font-medium">End Date</th>
                                                                    <th className="text-left p-2 text-muted-foreground font-medium">Delay</th>
                                                                    <th className="text-left p-2 text-muted-foreground font-medium">Actual</th>
                                                                    <th className="text-left p-2 text-muted-foreground font-medium">Completion</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {completion.workExecutionRows.map((row, idx) => (
                                                                    <tr key={idx} className="border-b border-white/5">
                                                                        <td className="p-2">{row.summary}</td>
                                                                        <td className="p-2">{formatDate(row.startDate)}</td>
                                                                        <td className="p-2">{formatDate(row.endDate)}</td>
                                                                        <td className="p-2">{row.timeDelay}</td>
                                                                        <td className="p-2">{row.actual}</td>
                                                                        <td className="p-2 font-semibold">{row.completionPercent}%</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Checklists */}
                                            <div className="mt-6">
                                                <h4 className="font-semibold mb-3">Quality Control Checklists</h4>
                                                <div className="grid md:grid-cols-3 gap-4">
                                                    {renderChecklistSection("Pre-Work", completion.preWorkChecklist, "preWorkChecklist", "text-blue-400", completion)}
                                                    {renderChecklistSection("During Work", completion.duringWorkChecklist, "duringWorkChecklist", "text-yellow-400", completion)}
                                                    {renderChecklistSection("Post-Work", completion.postWorkChecklist, "postWorkChecklist", "text-green-400", completion)}
                                                </div>
                                            </div>

                                            {/* QC Remarks */}
                                            {completion.qcRemarks && (
                                                <div className="mt-6">
                                                    <h4 className="font-semibold mb-2">QC Remarks</h4>
                                                    <p className="text-sm glass-card p-4">{completion.qcRemarks}</p>
                                                </div>
                                            )}

                                            {/* Contractor Signature */}
                                            {completion.contractorSignature && (
                                                <div className="mt-6">
                                                    <h4 className="font-semibold mb-3">Contractor Signature</h4>
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        <div>
                                                            <img
                                                                src={completion.contractorSignature}
                                                                alt="Contractor Signature"
                                                                className="border border-white/10 rounded-lg bg-white p-2 max-w-xs"
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-muted-foreground mb-1">Confirmation Date</p>
                                                            <p className="font-medium">{formatDate(completion.confirmationDate)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })
            })()}
            {/* Image Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>
                            <img
                                src={selectedImage}
                                alt="Checklist Proof"
                                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WorkCompletionsList;
