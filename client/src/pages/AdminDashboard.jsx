import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, useIsFetching } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Plus, RefreshCw, Users, Pencil, Trash2, FileText, ClipboardCheck, BarChart3, LineChart, Menu, X, Calendar as CalendarIcon, LogOut, Eye, Sheet, File, ShoppingCart, FileCheck, Download, RefreshCcw,
  CheckCircle,
  Database,
  Link2,
  ScrollText,
  UserX,
  Receipt,
  Wallet,
} from "lucide-react";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import PreviousEntries from "@/components/PreviousEntries";
import WorkOrderForm from "@/components/WorkOrderForm";
import WorkOrdersList from "@/components/WorkOrdersList";
import WorkCompletionsList from "@/components/WorkCompletionsList";
import WorkCompletionForm from "@/components/WorkCompletionForm";
import DailyDeploymentForm from "@/components/DailyDeploymentForm";
import UserManagement from "@/components/UserManagement";
import { contractorService } from "@/services/contractorService";
import { workOrderService } from "@/services/workOrderService";
import { workCompletionService } from "@/services/workCompletionService";
import { entryService } from "@/services/entryService";
import { getTasks, deleteTask, updateTask } from "@/services/taskService";
import settingsService from '../services/settingsService';
import MaterialVerificationsList from "@/components/MaterialVerificationsList";
import MasterTracking from "@/components/MasterTracking";
import TaskForm from "@/components/TaskForm";
import IndentForm from "@/components/IndentForm";
import indentService, { getIndents } from "@/services/indentService";
import { generateTaskPDF } from "@/utils/taskPdfExport";
import PurchaseOrderForm from "@/components/PurchaseOrderForm";
import PurchaseOrdersList from "@/components/PurchaseOrdersList";
import purchaseOrderService from "@/services/purchaseOrderService";
import siteLookupService from "@/services/siteLookupService";
import { uploadService } from "@/services/uploadService";
import { generatePDF } from "@/utils/pdfExport";
import { generateCSV } from "@/utils/csvExport";
import { generateExcel } from "@/utils/excelExport";
import { generateIndentPDF } from "@/utils/indentPdfExport";
import { generateIndentCSV } from "@/utils/indentCsvExport";
import { generateIndentExcel } from "@/utils/indentExcelExport";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import ConfirmModal from "@/components/ui/ConfirmModal";
import BillsList from "@/components/BillsList";
import PaymentVouchersList from "@/components/PaymentVouchersList";

const SHEET_MODULES = [
  { key: 'tasks', label: 'Tasks', settingKey: 'google_sheet_id', description: 'Task ID, Work Particulars, Contractor, Dates, Status, Project Manager' },
  { key: 'indents', label: 'Indents', settingKey: 'google_sheet_id_indents', description: 'Indent No, Site, Materials, Priority, Verification Status' },
  { key: 'purchase_orders', label: 'Purchase Orders', settingKey: 'google_sheet_id_purchase_orders', description: 'PO Number, Vendor, Items, Amounts, Verification Status' },
  { key: 'work_orders', label: 'Work Orders', settingKey: 'google_sheet_id_work_orders', description: 'WO Number, Location, Work Items, Total Amount' },
  { key: 'work_completions', label: 'Work Completions', settingKey: 'google_sheet_id_work_completions', description: 'WO Number, Contractor, Checklists, Materials Consumed' },
  { key: 'daily_progress', label: 'Daily Progress Reports', settingKey: 'google_sheet_id_entries', description: 'Date, Site, Supervisor, Workers, Material Consumption' },
  { key: 'bills', label: 'Bills', settingKey: 'google_sheet_id_bills', description: 'Bill No., Contractor, WO/PO Number, Amount, Status, Remarks, Attachments' },
];

const ACTION_COLORS = {
  CREATE: 'text-green-400 bg-green-500/10 border-green-500/20',
  UPDATE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
  VERIFY: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  LOGIN: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  OTHER: 'text-muted-foreground bg-white/5 border-white/10',
};

const ROLE_LABEL = {
  'super-admin': 'Super Admin',
  admin: 'Admin',
  engineer: 'Engineer',
  project_manager: 'Project Manager',
  purchase_manager: 'Purchase Manager',
  account_manager: 'Account Manager',
};

const LogsPanel = () => {
  const { user } = useAuth();
  const [logsPage, setLogsPage] = useState(1);
  const [allLogs, setAllLogs] = useState([]);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState(false);
  const [forceLogoutingId, setForceLogoutingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: sessionsData } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const { data } = await api.get('/logs/sessions');
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: ['logs', logsPage],
    queryFn: async () => {
      const { data } = await api.get(`/logs?page=${logsPage}&limit=50`);
      return data;
    },
    keepPreviousData: true,
  });

  useEffect(() => {
    if (logsData) {
      if (logsPage === 1) {
        setAllLogs(logsData.logs || []);
      } else {
        setAllLogs(prev => [...prev, ...(logsData.logs || [])]);
      }
      setHasMoreLogs(logsData.page < logsData.pages);
    }
  }, [logsData, logsPage]);

  const handleForceLogout = async (userId, email) => {
    setForceLogoutingId(userId);
    try {
      await api.delete(`/logs/sessions/${userId}`);
      toast.success(`${email} has been logged out`);
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to force-logout user');
    } finally {
      setForceLogoutingId(null);
    }
  };

  const handleClearLogs = async () => {
    setIsClearingLogs(true);
    try {
      await api.delete('/logs');
      setAllLogs([]);
      setLogsPage(1);
      setHasMoreLogs(false);
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      toast.success('Activity logs cleared');
    } catch {
      toast.error('Failed to clear logs');
    } finally {
      setIsClearingLogs(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">Activity Logs</h3>
          <p className="text-muted-foreground text-sm mt-1">Audit trail of all actions in the system</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-foreground font-medium">{user?.fullName || user?.email}</span>
            <span className="text-xs text-muted-foreground border-l border-white/10 pl-2">{user?.email}</span>
          </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsClearLogsModalOpen(true)}
          disabled={isClearingLogs || allLogs.length === 0}
          className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4" />
          Clear All Logs
        </Button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-foreground">
            Currently Logged In — {sessionsData?.sessions?.length ?? 0} user{sessionsData?.sessions?.length !== 1 ? 's' : ''}
          </span>
        </div>
        {!sessionsData?.sessions?.length ? (
          <p className="px-5 py-4 text-sm text-muted-foreground italic">No active sessions.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {sessionsData.sessions.map((s) => (
              <div key={s._id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {(s.fullName || s.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.fullName || s.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-medium text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    {ROLE_LABEL[s.role] || s.role}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Since {new Date(s.loginAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}
                  </p>
                </div>
                {s.userId !== user?._id && s.userId !== user?.id && (
                  <button
                    onClick={() => handleForceLogout(s.userId, s.email)}
                    disabled={forceLogoutingId === s.userId}
                    title={`Force logout ${s.email}`}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {forceLogoutingId === s.userId ? (
                      <span className="w-3 h-3 border border-red-400/40 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <UserX className="w-3.5 h-3.5" />
                    )}
                    Logout
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {isLogsLoading && logsPage === 1 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-3" />
            Loading logs...
          </div>
        ) : allLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <ScrollText className="w-10 h-10 opacity-30" />
            <p>No activity logs yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {allLogs.map((log) => (
              <div key={log._id} className="flex items-start gap-4 px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="shrink-0 mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${ACTION_COLORS[log.action] || ACTION_COLORS.OTHER}`}>
                    {log.action}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                      {log.module}
                    </span>
                    {log.ref && (
                      <span className="text-xs text-primary/70 font-mono">{log.ref}</span>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-1">{log.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{log.performedBy || 'System'}</span>
                    <span className="text-xs text-muted-foreground/50">·</span>
                    <span className="text-xs text-muted-foreground">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {hasMoreLogs && (
          <div className="p-4 flex justify-center border-t border-white/5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogsPage(p => p + 1)}
              disabled={isLogsLoading}
              className="gap-2"
            >
              {isLogsLoading ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : 'Load More'}
            </Button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isClearLogsModalOpen}
        onClose={() => setIsClearLogsModalOpen(false)}
        onConfirm={handleClearLogs}
        title="Clear All Activity Logs"
        message="This will permanently delete all activity logs and cannot be undone."
        confirmText="Clear All Logs"
      />
    </motion.div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
  const isSuperAdmin = user?.role === 'super-admin';
  const isSiteEngineer = user?.role === 'engineer';
  const isTaskManager = user?.role === 'admin' || user?.role === 'project_manager' || user?.role === 'purchase_manager';
  const isPurchaseManager = user?.role === 'purchase_manager';
  const canCreatePO = isAdmin || user?.role === 'purchase_manager';
  const canChangePurchaseOrderStatus = user?.role === 'admin' || user?.role === 'project_manager' || user?.role === 'purchase_manager';
  const panelTitle =
    user?.role === 'super-admin' ? 'Super Admin' :
      user?.role === 'admin' ? 'Admin' :
        user?.role === 'project_manager' ? 'Project Manager' :
          user?.role === 'purchase_manager' ? 'Purchase Manager' :
            'Site Engineer';
  const queryClient = useQueryClient();

  useEffect(() => {
    // Mount the handler for PurchaseOrdersList
    window.handleCreateRqubePurchaseOrder = (po, rqubeData) => {
      // Create a duplicate/template PO for RQUBE based on existing PO
      const items = po.items?.map(item => ({
        materialDescription: item.materialDescription || "",
        unit: item.unit || "",
        quantity: item.quantity || "",
        rate: item.rate || "",
        baseAmount: item.baseAmount || 0,
        taxRate: item.taxRate || "18",
        taxAmount: item.taxAmount || 0,
        amount: item.amount || 0
      })) || [];

      setEditingPurchaseOrder({
        indentReferences: po.indentReferences || [],
        taskReference: po.taskReference || "",
        vendorName: po.vendorName || "",
        vendorAddress: po.vendorAddress || "",
        vendorGst: po.vendorGst || "",
        vendorContactNo: po.vendorContactNo || "",
        ...rqubeData,
        items
      });
      setShowPurchaseOrderForm(true);
      setActiveTab('purchase-order');
    };

    return () => {
      delete window.handleCreateRqubePurchaseOrder;
    };
  }, []);
  const location = useLocation();
  const activeTab = location.hash.replace('#', '') || 'tasks';
  const setActiveTab = (tab) => navigate(`#${tab}`, { replace: true });
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState(null);
  const [workOrderToDelete, setWorkOrderToDelete] = useState(null);
  const [showWorkCompletionForm, setShowWorkCompletionForm] = useState(false);
  const [editingWorkCompletion, setEditingWorkCompletion] = useState(null);
  const [workCompletionToDelete, setWorkCompletionToDelete] = useState(null);
  const [certificationSourceWorkOrder, setCertificationSourceWorkOrder] = useState(null);
  const [showDeploymentForm, setShowDeploymentForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showIndentForm, setShowIndentForm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newContractorName, setNewContractorName] = useState("");
  const [editingContractor, setEditingContractor] = useState(null);
  const [contractorToDelete, setContractorToDelete] = useState(null);

  const [isIndentViewOpen, setIsIndentViewOpen] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [editingIndent, setEditingIndent] = useState(null);
  const [isVerifyIndentOpen, setIsVerifyIndentOpen] = useState(false);
  const [verifyingIndent, setVerifyingIndent] = useState(null);
  const [verifyFormData, setVerifyFormData] = useState({ verifiedByPurchaseManager: false, verifiedPdf: null });
  const [indentToDelete, setIndentToDelete] = useState(null);
  const [indentSearch, setIndentSearch] = useState('');
  const [indentFilterPriority, setIndentFilterPriority] = useState('all');
  const [indentFilterStatus, setIndentFilterStatus] = useState('all');

  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState(null);
  const [purchaseOrderSearch, setPurchaseOrderSearch] = useState('');
  const [purchaseOrderFilterStatus, setPurchaseOrderFilterStatus] = useState('all');
  const [highlightedVerificationPoId, setHighlightedVerificationPoId] = useState(null);

  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');
  const [contractorSearch, setContractorSearch] = useState('');
  const [dailyProgressSearch, setDailyProgressSearch] = useState('');
  const [masterTrackingSearch, setMasterTrackingSearch] = useState('');

  const [taskToDelete, setTaskToDelete] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({});

  // Task Pagination State
  const [tasks, setTasks] = useState([]);
  const [taskPage, setTaskPage] = useState(1);
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isTasksLoadingMore, setIsTasksLoadingMore] = useState(false);

  // Site Lookup states
  const [activeLookupTab, setActiveLookupTab] = useState('siteName');
  const [isLookupDialogOpen, setIsLookupDialogOpen] = useState(false);
  const [newLookupValue, setNewLookupValue] = useState("");
  const [newVendorAddress, setNewVendorAddress] = useState("");
  const [newVendorGst, setNewVendorGst] = useState("");
  const [newVendorContactNo, setNewVendorContactNo] = useState("");
  const [editingLookup, setEditingLookup] = useState(null);
  const [lookupToDelete, setLookupToDelete] = useState(null);

  // Date filter for Daily Progress
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Integrations state
  const [sheetIds, setSheetIds] = useState({});
  const [sheetInputs, setSheetInputs] = useState({});
  const [sheetSaving, setSheetSaving] = useState({});

  // Work Orders Pagination State
  const [workOrders, setWorkOrders] = useState([]);
  const [workOrderPage, setWorkOrderPage] = useState(1);
  const [hasMoreWorkOrders, setHasMoreWorkOrders] = useState(false);
  const [isWorkOrdersLoading, setIsWorkOrdersLoading] = useState(false);
  const [isWorkOrdersLoadingMore, setIsWorkOrdersLoadingMore] = useState(false);

  // Work Completions Pagination State
  const [workCompletions, setWorkCompletions] = useState([]);
  const [workCompletionPage, setWorkCompletionPage] = useState(1);
  const [hasMoreWorkCompletions, setHasMoreWorkCompletions] = useState(false);
  const [isWorkCompletionsLoading, setIsWorkCompletionsLoading] = useState(false);
  const [isWorkCompletionsLoadingMore, setIsWorkCompletionsLoadingMore] = useState(false);

  // Daily Deployments (Entries) Pagination State
  const [entries, setEntries] = useState([]);
  const [entryPage, setEntryPage] = useState(1);
  const [hasMoreEntries, setHasMoreEntries] = useState(false);
  const [isEntriesLoading, setIsEntriesLoading] = useState(false);
  const [isEntriesLoadingMore, setIsEntriesLoadingMore] = useState(false);

  // Queries
  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: contractorService.getAll
  });

  // Fetch Work Orders with Pagination
  const fetchWorkOrders = async (pageNum, isLoadMore = false) => {
    try {
      isLoadMore ? setIsWorkOrdersLoadingMore(true) : setIsWorkOrdersLoading(true);
      const data = await workOrderService.getAllWorkOrders({ page: pageNum, limit: 100 });
      setHasMoreWorkOrders(data.hasMore);
      const fetchedWO = data.workOrders || [];
      if (isLoadMore) {
        setWorkOrders(prev => [...prev, ...fetchedWO]);
      } else {
        setWorkOrders(fetchedWO);
      }
    } catch (error) {
      console.error("Failed to fetch work orders:", error);
      toast.error("Failed to load work orders");
    } finally {
      setIsWorkOrdersLoading(false);
      setIsWorkOrdersLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders(1, false);
    setWorkOrderPage(1);
  }, []);

  const loadMoreWorkOrders = () => {
    if (!hasMoreWorkOrders || isWorkOrdersLoadingMore) return;
    const nextPage = workOrderPage + 1;
    setWorkOrderPage(nextPage);
    fetchWorkOrders(nextPage, true);
  };

  // Fetch Work Completions with Pagination
  const fetchWorkCompletions = async (pageNum, isLoadMore = false) => {
    try {
      isLoadMore ? setIsWorkCompletionsLoadingMore(true) : setIsWorkCompletionsLoading(true);
      const data = await workCompletionService.getAllWorkCompletions({ page: pageNum, limit: 100 });
      setHasMoreWorkCompletions(data.hasMore);
      const fetchedWC = data.workCompletions || [];
      if (isLoadMore) {
        setWorkCompletions(prev => [...prev, ...fetchedWC]);
      } else {
        setWorkCompletions(fetchedWC);
      }
    } catch (error) {
      console.error("Failed to fetch work completions:", error);
      toast.error("Failed to load work certifications");
    } finally {
      setIsWorkCompletionsLoading(false);
      setIsWorkCompletionsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchWorkCompletions(1, false);
    setWorkCompletionPage(1);
  }, []);

  const loadMoreWorkCompletions = () => {
    if (!hasMoreWorkCompletions || isWorkCompletionsLoadingMore) return;
    const nextPage = workCompletionPage + 1;
    setWorkCompletionPage(nextPage);
    fetchWorkCompletions(nextPage, true);
  };

  // Fetch Daily Deployments (Entries) with Pagination
  const fetchEntries = async (pageNum, isLoadMore = false) => {
    try {
      isLoadMore ? setIsEntriesLoadingMore(true) : setIsEntriesLoading(true);
      const data = await entryService.getAll({ page: pageNum, limit: 100 });
      setHasMoreEntries(data.hasMore);
      const fetchedEntries = data.entries || [];
      if (isLoadMore) {
        setEntries(prev => [...prev, ...fetchedEntries]);
      } else {
        setEntries(fetchedEntries);
      }
    } catch (error) {
      console.error("Failed to fetch entries:", error);
      toast.error("Failed to load daily deployments");
    } finally {
      setIsEntriesLoading(false);
      setIsEntriesLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchEntries(1, false);
    setEntryPage(1);
  }, []);

  const loadMoreEntries = () => {
    if (!hasMoreEntries || isEntriesLoadingMore) return;
    const nextPage = entryPage + 1;
    setEntryPage(nextPage);
    fetchEntries(nextPage, true);
  };

  // Fetch Tasks with Pagination
  const fetchTasks = async (pageNum, isLoadMore = false) => {
    try {
      isLoadMore ? setIsTasksLoadingMore(true) : setIsTasksLoading(true);
      const data = await getTasks({ page: pageNum, limit: 100 });
      setHasMoreTasks(data.hasMore);
      const fetchedTasks = data.tasks || [];
      if (isLoadMore) {
        setTasks(prev => [...prev, ...fetchedTasks]);
      } else {
        setTasks(fetchedTasks);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsTasksLoading(false);
      setIsTasksLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTasks(1, false);
    setTaskPage(1);
  }, []); // Refetch when component mounts or filter changes if needed

  const loadMoreTasks = () => {
    if (!hasMoreTasks || isTasksLoadingMore) return;
    const nextPage = taskPage + 1;
    setTaskPage(nextPage);
    fetchTasks(nextPage, true);
  };

  // Indents Pagination State
  const [indents, setIndents] = useState([]);
  const [indentPage, setIndentPage] = useState(1);
  const [hasMoreIndents, setHasMoreIndents] = useState(false);
  const [isIndentsLoading, setIsIndentsLoading] = useState(false);
  const [isIndentsLoadingMore, setIsIndentsLoadingMore] = useState(false);

  // Fetch Indents with Pagination
  const fetchIndents = async (pageNum, isLoadMore = false) => {
    try {
      isLoadMore ? setIsIndentsLoadingMore(true) : setIsIndentsLoading(true);
      const data = await getIndents({ page: pageNum, limit: 100 });
      setHasMoreIndents(data.hasMore);
      const fetchedIndents = data.indents || [];
      if (isLoadMore) {
        setIndents(prev => [...prev, ...fetchedIndents]);
      } else {
        setIndents(fetchedIndents);
      }
    } catch (error) {
      console.error("Failed to fetch indents:", error);
      toast.error("Failed to load indents");
    } finally {
      setIsIndentsLoading(false);
      setIsIndentsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchIndents(1, false);
    setIndentPage(1);
  }, []);

  const loadMoreIndents = () => {
    if (!hasMoreIndents || isIndentsLoadingMore) return;
    const nextPage = indentPage + 1;
    setIndentPage(nextPage);
    fetchIndents(nextPage, true);
  };

  // Purchase Orders Pagination State
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseOrderPage, setPurchaseOrderPage] = useState(1);
  const [hasMorePurchaseOrders, setHasMorePurchaseOrders] = useState(false);
  const [isPurchaseOrdersLoading, setIsPurchaseOrdersLoading] = useState(false);
  const [isPurchaseOrdersLoadingMore, setIsPurchaseOrdersLoadingMore] = useState(false);

  // Fetch Purchase Orders with Pagination
  const fetchPurchaseOrders = async (pageNum, isLoadMore = false) => {
    try {
      isLoadMore ? setIsPurchaseOrdersLoadingMore(true) : setIsPurchaseOrdersLoading(true);
      const data = await purchaseOrderService.getPurchaseOrders({ page: pageNum, limit: 100 });
      setHasMorePurchaseOrders(data.hasMore);
      const fetchedPOs = data.purchaseOrders || [];
      if (isLoadMore) {
        setPurchaseOrders(prev => [...prev, ...fetchedPOs]);
      } else {
        setPurchaseOrders(fetchedPOs);
      }
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
      toast.error("Failed to load purchase orders");
    } finally {
      setIsPurchaseOrdersLoading(false);
      setIsPurchaseOrdersLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders(1, false);
    setPurchaseOrderPage(1);
  }, []);

  const loadMorePurchaseOrders = () => {
    if (!hasMorePurchaseOrders || isPurchaseOrdersLoadingMore) return;
    const nextPage = purchaseOrderPage + 1;
    setPurchaseOrderPage(nextPage);
    fetchPurchaseOrders(nextPage, true);
  };

  // Settings Queries — one per sheet module (hooks must be at top level, not in .map())
  const sheetQ0 = useQuery({ queryKey: ['settings', SHEET_MODULES[0].settingKey], queryFn: () => settingsService.getSetting(SHEET_MODULES[0].settingKey), enabled: user?.role === 'admin' });
  const sheetQ1 = useQuery({ queryKey: ['settings', SHEET_MODULES[1].settingKey], queryFn: () => settingsService.getSetting(SHEET_MODULES[1].settingKey), enabled: user?.role === 'admin' });
  const sheetQ2 = useQuery({ queryKey: ['settings', SHEET_MODULES[2].settingKey], queryFn: () => settingsService.getSetting(SHEET_MODULES[2].settingKey), enabled: user?.role === 'admin' });
  const sheetQ3 = useQuery({ queryKey: ['settings', SHEET_MODULES[3].settingKey], queryFn: () => settingsService.getSetting(SHEET_MODULES[3].settingKey), enabled: user?.role === 'admin' });
  const sheetQ4 = useQuery({ queryKey: ['settings', SHEET_MODULES[4].settingKey], queryFn: () => settingsService.getSetting(SHEET_MODULES[4].settingKey), enabled: user?.role === 'admin' });
  const sheetQ5 = useQuery({ queryKey: ['settings', SHEET_MODULES[5].settingKey], queryFn: () => settingsService.getSetting(SHEET_MODULES[5].settingKey), enabled: user?.role === 'admin' });
  const sheetQ6 = useQuery({ queryKey: ['settings', SHEET_MODULES[6].settingKey], queryFn: () => settingsService.getSetting(SHEET_MODULES[6].settingKey), enabled: user?.role === 'admin' });

  // Populate sheetIds when settings load
  useEffect(() => {
    const queries = [sheetQ0, sheetQ1, sheetQ2, sheetQ3, sheetQ4, sheetQ5, sheetQ6];
    const updated = {};
    SHEET_MODULES.forEach((mod, i) => {
      const val = queries[i].data?.value;
      if (val) updated[mod.key] = Array.isArray(val) ? val : val.split(',').map(s => s.trim()).filter(Boolean);
    });
    if (Object.keys(updated).length > 0) setSheetIds(prev => ({ ...prev, ...updated }));
  }, [sheetQ0.data, sheetQ1.data, sheetQ2.data, sheetQ3.data, sheetQ4.data, sheetQ5.data, sheetQ6.data]);

  const { data: siteNames = [] } = useQuery({
    queryKey: ['siteLookups', 'siteName'],
    queryFn: () => siteLookupService.getSiteLookups('siteName')
  });

  const { data: siteEngineers = [] } = useQuery({
    queryKey: ['siteLookups', 'siteEngineer'],
    queryFn: () => siteLookupService.getSiteLookups('siteEngineer')
  });

  const { data: materialGroups = [] } = useQuery({
    queryKey: ['siteLookups', 'materialGroup'],
    queryFn: () => siteLookupService.getSiteLookups('materialGroup')
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['siteLookups', 'vendor'],
    queryFn: () => siteLookupService.getSiteLookups('vendor')
  });

  // Global loading state
  const isRefreshing = useIsFetching() > 0;
  const lastUpdate = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      fetchTasks(1, false);
      toast.success('Task deleted successfully');
      setTaskToDelete(null);
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...data }) => updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully');
    },
    onError: () => toast.error('Failed to update task'),
  });

  const verifyIndentMutation = useMutation({
    mutationFn: ({ id, formData }) => indentService.verifyIndent(id, formData),
    onSuccess: () => {
      fetchIndents(1, false);
      toast.success('Indent verification updated');
      setIsVerifyIndentOpen(false);
      setVerifyingIndent(null);
    },
    onError: (error) => {
      console.error("Verification failed:", error, error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to verify indent');
    }
  });

  const deleteIndentMutation = useMutation({
    mutationFn: (id) => indentService.deleteIndent(id),
    onSuccess: () => {
      fetchIndents(1, false);
      toast.success('Indent deleted successfully');
      setIndentToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting indent:', error);
      toast.error('Failed to delete indent');
    }
  });

  const deletePurchaseOrderMutation = useMutation({
    mutationFn: (id) => purchaseOrderService.deletePurchaseOrder(id),
    onSuccess: () => {
      fetchPurchaseOrders(1, false);
      toast.success('Purchase Order deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete Purchase Order');
    }
  });

  const updatePurchaseOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }) => purchaseOrderService.updatePurchaseOrder(id, { status }),
    onSuccess: () => {
      fetchPurchaseOrders(1, false);
      toast.success('Purchase Order status updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  });

  // Mutations
  const createContractorMutation = useMutation({
    mutationFn: (name) => contractorService.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success("Contractor added successfully");
      setNewContractorName("");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save contractor');
    }
  });

  const updateContractorMutation = useMutation({
    mutationFn: ({ id, name }) => contractorService.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success("Contractor updated successfully");
      setNewContractorName("");
      setEditingContractor(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save contractor');
    }
  });

  const deleteContractorMutation = useMutation({
    mutationFn: (id) => contractorService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success("Contractor deleted");
    },
    onError: (error) => {
      console.error('Error deleting contractor:', error);
      toast.error('Failed to delete contractor');
    }
  });

  // Site Lookup Mutations
  const createLookupMutation = useMutation({
    mutationFn: ({ type, value, vendorAddress, vendorGst, vendorContactNo }) => siteLookupService.createSiteLookup(type, value, vendorAddress, vendorGst, vendorContactNo),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['siteLookups', variables.type] });
      toast.success("Item added successfully");
      setIsLookupDialogOpen(false);
      setNewLookupValue("");
      setNewVendorAddress("");
      setNewVendorGst("");
      setNewVendorContactNo("");
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add item')
  });

  const updateLookupMutation = useMutation({
    mutationFn: ({ id, value, vendorAddress, vendorGst, vendorContactNo }) => siteLookupService.updateSiteLookup(id, value, vendorAddress, vendorGst, vendorContactNo),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['siteLookups', variables.type] });
      toast.success("Item updated successfully");
      setIsLookupDialogOpen(false);
      setEditingLookup(null);
      setNewLookupValue("");
      setNewVendorAddress("");
      setNewVendorGst("");
      setNewVendorContactNo("");
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update item')
  });

  const deleteLookupMutation = useMutation({
    mutationFn: ({ id }) => siteLookupService.deleteSiteLookup(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['siteLookups', variables.type] });
      toast.success("Item deleted");
    },
    onError: () => toast.error('Failed to delete item')
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  const handleExport = async (type, entry) => {
    try {
      const date = entry.date;
      if (type === 'pdf') {
        await generatePDF([entry]);
        toast.success('PDF export initiated');
      } else if (type === 'csv') {
        generateCSV([entry], date);
        toast.success('CSV export completed');
      } else if (type === 'excel') {
        generateExcel([entry], date);
        toast.success('Excel export completed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const handleContractorSubmit = (e) => {
    e.preventDefault();
    if (!newContractorName.trim()) {
      toast.error("Please enter a contractor name");
      return;
    }

    if (editingContractor) {
      updateContractorMutation.mutate({ id: editingContractor._id, name: newContractorName });
    } else {
      createContractorMutation.mutate(newContractorName);
    }
  };

  const handleEditContractor = (contractor) => {
    setNewContractorName(contractor.name);
    setEditingContractor(contractor);
    setIsDialogOpen(true);
  };

  const handleDeleteContractor = (id) => {
    setContractorToDelete(id);
  };

  const executeDeleteContractor = async () => {
    if (contractorToDelete) {
      deleteContractorMutation.mutate(contractorToDelete);
      setContractorToDelete(null); // will clear via mutation but to be safe
    }
  };

  const handleOpenAddDialog = () => {
    setNewContractorName("");
    setEditingContractor(null);
    setIsDialogOpen(true);
  };

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    if (!newLookupValue.trim()) return toast.error("Please enter a value");

    if (editingLookup) {
      updateLookupMutation.mutate({
        id: editingLookup._id,
        value: newLookupValue,
        vendorAddress: newVendorAddress,
        vendorGst: newVendorGst,
        vendorContactNo: newVendorContactNo,
        type: activeLookupTab
      });
    } else {
      createLookupMutation.mutate({
        type: activeLookupTab,
        value: newLookupValue,
        vendorAddress: newVendorAddress,
        vendorGst: newVendorGst,
        vendorContactNo: newVendorContactNo
      });
    }
  };

  const handleEditLookup = (lookup) => {
    setEditingLookup(lookup);
    setNewLookupValue(lookup.value);
    setNewVendorAddress(lookup.vendorAddress || "");
    setNewVendorGst(lookup.vendorGst || "");
    setNewVendorContactNo(lookup.vendorContactNo || "");
    setIsLookupDialogOpen(true);
  };

  const handleDeleteLookup = (lookup) => {
    setLookupToDelete(lookup);
  };

  const executeDeleteLookup = async () => {
    if (lookupToDelete) {
      deleteLookupMutation.mutate({ id: lookupToDelete._id, type: activeLookupTab });
      setLookupToDelete(null);
    }
  };

  const handleDeleteWorkOrder = (workOrder) => {
    setWorkOrderToDelete(workOrder);
  };

  const handleDeleteWorkCompletion = (completion) => {
    setWorkCompletionToDelete(completion);
  };

  const confirmDeleteWorkCompletion = async () => {
    if (!workCompletionToDelete) return;
    try {
      await workCompletionService.deleteWorkCompletion(workCompletionToDelete._id);
      queryClient.invalidateQueries({ queryKey: ['workCompletions'] });
      toast.success("Certification deleted successfully");
      setWorkCompletionToDelete(null);
    } catch (error) {
      console.error("Failed to delete Work Completion:", error);
      toast.error(error.response?.data?.message || "Failed to delete certification");
    }
  };

  const confirmDeleteWorkOrder = async () => {
    if (!workOrderToDelete) return;
    try {
      await workOrderService.deleteWorkOrder(workOrderToDelete._id);
      setWorkOrders(prev => prev.filter(wo => wo._id !== workOrderToDelete._id));
      toast.success("Work Order deleted successfully");
      setWorkOrderToDelete(null);
    } catch (error) {
      console.error("Failed to delete Work Order:", error);
      toast.error(error.response?.data?.message || "Failed to delete Work Order");
    }
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;
    try {
      await entryService.delete(entryToDelete._id);
      setEntries(prev => prev.filter(e => e._id !== entryToDelete._id));
      toast.success("Deployment entry deleted successfully");
      setEntryToDelete(null);
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast.error(error.response?.data?.message || "Failed to delete entry");
    }
  };

  const totalWorkers = entries.reduce((sum, e) => sum + e.workerCount, 0);

  // Sheet integration handlers
  const handleSaveSheet = async (moduleKey, settingKey, ids) => {
    setSheetSaving(prev => ({ ...prev, [moduleKey]: true }));
    try {
      await settingsService.updateSetting(settingKey, ids);
      setSheetIds(prev => ({ ...prev, [moduleKey]: ids }));
      toast.success('Google Sheet configuration saved!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save sheet configuration');
    } finally {
      setSheetSaving(prev => ({ ...prev, [moduleKey]: false }));
    }
  };

  const handleAddSheetId = (moduleKey, settingKey) => {
    const input = (sheetInputs[moduleKey] || '').trim();
    if (!input) { toast.error('Please enter a Spreadsheet ID'); return; }
    const current = sheetIds[moduleKey] || [];
    if (current.includes(input)) { toast.error('This Spreadsheet ID is already added.'); return; }
    const newIds = [...current, input];
    setSheetInputs(prev => ({ ...prev, [moduleKey]: '' }));
    handleSaveSheet(moduleKey, settingKey, newIds);
  };

  const handleRemoveSheetId = (moduleKey, settingKey, idToRemove) => {
    const newIds = (sheetIds[moduleKey] || []).filter(id => id !== idToRemove);
    handleSaveSheet(moduleKey, settingKey, newIds);
  };

  // Sidebar link component
  const SidebarLink = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        if (id !== 'workorder') setShowWorkOrderForm(false);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === id
        ? 'bg-primary/20 text-primary border border-primary/20'
        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
        }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen relative overflow-hidden flex bg-background">
      <BackgroundOrbs />

      {/* Desktop Sidebar */}
      <aside className="relative z-20 w-64 border-r border-white/10 bg-black/20 backdrop-blur-xl flex flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-foreground">
            {panelTitle} <span className="text-gradient-primary">Panel</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Deployment Management</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4 overflow-y-auto">
          <SidebarLink id="tasks" label="Project Tasks" icon={ClipboardCheck} />
          <SidebarLink id="indent" label="Indent / Site Requirement" icon={FileText} />
          <SidebarLink id="purchase-order" label="Purchase Order" icon={ShoppingCart} />
          <SidebarLink id="material-verification" label="Material Verification Certificate" icon={FileCheck} />
          <SidebarLink id="entries" label="Daily Progress Report" icon={Users} />
          <SidebarLink id="workorder" label="Work Orders" icon={FileText} />
          <SidebarLink id="certification" label="Certifications" icon={ClipboardCheck} />

          <SidebarLink id="master-tracking" label="Master Tracking" icon={LineChart} />
          {isAdmin && (
            <>
              <SidebarLink id="contractors" label="Contractors" icon={Users} />
              <SidebarLink id="users" label="User Management" icon={Users} />
            </>
          )}
          <SidebarLink id="site-lookups" label="Site Lookups" icon={FileText} />
          {isAdmin && <SidebarLink id="integrations" label="Integrations" icon={Link2} />}
          {isSuperAdmin && <SidebarLink id="logs" label="Activity Logs" icon={ScrollText} />}
          <SidebarLink id="bills" label="Bills" icon={Receipt} />
          <SidebarLink id="payment-vouchers" label="Payment Vouchers" icon={Wallet} />
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar & Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-background/95 backdrop-blur-xl border-r border-white/10 flex flex-col md:hidden"
            >
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {panelTitle} <span className="text-gradient-primary">Panel</span>
                  </h1>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 space-y-2 py-4 overflow-y-auto">
                <SidebarLink id="tasks" label="Project Tasks" icon={ClipboardCheck} />
                <SidebarLink id="indent" label="Indent / Site Requirement" icon={FileText} />
                <SidebarLink id="purchase-order" label="Purchase Order" icon={ShoppingCart} />
                <SidebarLink id="material-verification" label="Material Verification Certificate" icon={FileCheck} />
                <SidebarLink id="entries" label="Daily Progress Report" icon={Users} />
                <SidebarLink id="workorder" label="Work Orders" icon={FileText} />
                <SidebarLink id="certification" label="Certifications" icon={ClipboardCheck} />

                <SidebarLink id="master-tracking" label="Master Tracking" icon={LineChart} />
                {isAdmin && (
                  <>
                    <SidebarLink id="contractors" label="Contractors" icon={Users} />
                    <SidebarLink id="users" label="User Management" icon={Users} />
                  </>
                )}
                <SidebarLink id="site-lookups" label="Site Lookups" icon={FileText} />
                {isAdmin && <SidebarLink id="integrations" label="Integrations" icon={Link2} />}
                {isSuperAdmin && <SidebarLink id="logs" label="Activity Logs" icon={ScrollText} />}
                <SidebarLink id="bills" label="Bills" icon={Receipt} />
                <SidebarLink id="payment-vouchers" label="Payment Vouchers" icon={Wallet} />
              </nav>

              <div className="p-4 border-t border-white/10">
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/login");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-white/10 bg-black/10 backdrop-blur-md flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-foreground truncate max-w-[200px] md:max-w-none">
              {activeTab === 'entries' && 'Daily Progress Report'}
              {activeTab === 'workorder' && 'Work Order Management'}
              {activeTab === 'certification' && 'Work Completion & QA/QC'}

              {activeTab === 'master-tracking' && 'Master Project Tracking'}
              {activeTab === 'contractors' && 'Contractor Management'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'site-lookups' && 'Site Lookups Configuration'}
              {activeTab === 'tasks' && 'Project Tasks'}
              {activeTab === 'indent' && 'Indent / Site Requirement'}
              {activeTab === 'purchase-order' && 'Purchase Order Management'}
              {activeTab === 'material-verification' && 'Material Verification Certificate'}
              {activeTab === 'integrations' && 'Integrations'}
              {activeTab === 'logs' && isSuperAdmin && 'Activity Logs'}
              {activeTab === 'bills' && 'Bills'}
              {activeTab === 'payment-vouchers' && 'Payment Vouchers'}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {activeTab === 'contractors' && isAdmin && (
              <Button onClick={handleOpenAddDialog} size="sm" className="gap-2 text-xs md:text-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Contractor</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}

            {activeTab === 'site-lookups' && (
              <Button onClick={() => {
                setNewLookupValue('');
                setNewVendorAddress('');
                setNewVendorGst('');
                setNewVendorContactNo('');
                setEditingLookup(null);
                setIsLookupDialogOpen(true);
              }} size="sm" className="gap-2 text-xs md:text-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">
                  Add {activeLookupTab === 'siteName' ? 'Site' : activeLookupTab === 'siteEngineer' ? 'Engineer' : activeLookupTab === 'vendor' ? 'Vendor' : 'Material'}
                </span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}

            {activeTab === 'tasks' && !showTaskForm && (
              <Button onClick={() => setShowTaskForm(true)} size="sm" className="gap-2 text-xs md:text-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Assign New Task</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}

            {activeTab === 'indent' && !showIndentForm && (
              <Button onClick={() => setShowIndentForm(true)} size="sm" className="gap-2 text-xs md:text-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Indent</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}

            {activeTab === 'purchase-order' && !showPurchaseOrderForm && canCreatePO && (
              <div className="flex gap-2">
                <Button onClick={() => setShowPurchaseOrderForm(true)} size="sm" className="gap-2 text-xs md:text-sm">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Purchase Order</span>
                  <span className="sm:hidden">New PO</span>
                </Button>
                <Button onClick={() => {
                  setEditingPurchaseOrder({
                    shipToCompanyName: "RQUBE BUILDCON PRIVATE LIMITED",
                    termsAndConditions: "Billing must be in Name of \"RQUBE BUILDCON PRIVATE LIMITED\"\nMaterial Should Reach On Site Before 5:45 PM\nMaterial Delivery Date : Next day of payment.\nProperly Signed challan and MRN's Should be attached with bill at the time of submission.\nMaterial Found defective to be replaced at no additional cost to the purchaser."
                  });
                  setShowPurchaseOrderForm(true);
                  setActiveTab('purchase-order');
                }} size="sm" className="gap-2 text-xs md:text-sm bg-purple-600 hover:bg-purple-700 text-white border-none">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">RQUBE</span>
                  <span className="sm:hidden">RQUBE</span>
                </Button>
              </div>
            )}

            {activeTab === 'workorder' && !showWorkOrderForm && (
              <Button onClick={() => {
                setEditingWorkOrder(null);
                setShowWorkOrderForm(true);
              }} size="sm" className="gap-2 text-xs md:text-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Work Order</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}

            {activeTab === 'certification' && !showWorkCompletionForm && (
              <Button onClick={() => {
                setEditingWorkCompletion(null);
                setShowWorkCompletionForm(true);
              }} size="sm" className="gap-2 text-xs md:text-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Certification</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'entries' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-6"
            >
              {showDeploymentForm ? (
                <div className="glass-card p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{editingEntry ? 'Edit Progress Report Entry' : 'New Daily Progress Report Entry'}</h3>
                    <Button variant="ghost" onClick={() => {
                      setShowDeploymentForm(false);
                      setEditingEntry(null);
                    }}>Cancel</Button>
                  </div>
                  <DailyDeploymentForm
                    initialData={editingEntry}
                    onSuccess={() => {
                      setShowDeploymentForm(false);
                      setEditingEntry(null);
                      fetchEntries(1, false);
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setEditingEntry(null);
                        setShowDeploymentForm(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> New Deployment Entry
                    </Button>
                  </div>
                  <PreviousEntries
                    entries={entries}
                    hasMore={hasMoreEntries}
                    isLoadingMore={isEntriesLoadingMore}
                    onLoadMore={loadMoreEntries}
                    onExport={handleExport}
                    isAdmin={isAdmin}
                    onEdit={(entry) => {
                      setEditingEntry(entry);
                      setShowDeploymentForm(true);
                    }}
                    onDelete={(entry) => setEntryToDelete(entry)}
                  />
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'workorder' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              {showWorkOrderForm ? (
                <div className="glass-card p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{editingWorkOrder ? 'Edit Work Order' : 'New Work Order'}</h3>
                    <Button variant="ghost" onClick={() => {
                      setShowWorkOrderForm(false);
                      setEditingWorkOrder(null);
                    }}>Cancel</Button>
                  </div>
                  <WorkOrderForm
                    initialData={editingWorkOrder}
                    onSuccess={async () => {
                      setShowWorkOrderForm(false);
                      setEditingWorkOrder(null);
                      fetchWorkOrders(1, false);
                    }}
                  />
                </div>
              ) : (
                <WorkOrdersList
                  workOrders={workOrders}
                  hasMore={hasMoreWorkOrders}
                  isLoadingMore={isWorkOrdersLoadingMore}
                  onLoadMore={loadMoreWorkOrders}
                  isAdmin={isAdmin}
                  onEdit={(order) => {
                    setEditingWorkOrder(order);
                    setShowWorkOrderForm(true);
                  }}
                  onDelete={handleDeleteWorkOrder}
                  onCreateNew={() => {
                    setEditingWorkOrder(null);
                    setShowWorkOrderForm(true);
                  }}
                  onCreateCertification={(order) => {
                    setEditingWorkCompletion(null);
                    setCertificationSourceWorkOrder(order);
                    setShowWorkCompletionForm(true);
                    setActiveTab('certification');
                  }}
                  onSuccessUpload={() => fetchWorkOrders(1, false)}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'certification' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              {showWorkCompletionForm ? (
                <div className="glass-card p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{editingWorkCompletion ? 'Edit Certification' : 'New Certification'}</h3>
                    <Button variant="ghost" onClick={() => {
                      setShowWorkCompletionForm(false);
                      setEditingWorkCompletion(null);
                      setCertificationSourceWorkOrder(null);
                    }}>Cancel</Button>
                  </div>
                  <WorkCompletionForm
                    initialData={editingWorkCompletion}
                    sourceWorkOrder={certificationSourceWorkOrder}
                    onSuccess={() => {
                      setShowWorkCompletionForm(false);
                      setEditingWorkCompletion(null);
                      setCertificationSourceWorkOrder(null);
                      fetchWorkCompletions(1, false);
                    }}
                  />
                </div>
              ) : (
                <WorkCompletionsList
                  workCompletions={workCompletions}
                  hasMore={hasMoreWorkCompletions}
                  isLoadingMore={isWorkCompletionsLoadingMore}
                  onLoadMore={loadMoreWorkCompletions}
                  onRefresh={() => fetchWorkCompletions(1, false)}
                  isAdmin={isAdmin}
                  onEdit={(completion) => {
                    setEditingWorkCompletion(completion);
                    setShowWorkCompletionForm(true);
                  }}
                  onDelete={handleDeleteWorkCompletion}
                  onCreateNew={() => {
                    setEditingWorkCompletion(null);
                    setShowWorkCompletionForm(true);
                  }}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'daily-progress' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-full mx-auto"
            >
              {/* Daily Progress Section */}
              <div className="glass-card p-6 md:p-8">
                <div className="flex flex-col gap-6 mb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-foreground">Daily Progress Reports</h3>
                      <p className="text-muted-foreground text-sm">Track real-time progress of all work orders</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                      <div className="relative w-full sm:w-64">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input type="text" placeholder="Search Work Order No…" value={dailyProgressSearch} onChange={(e) => setDailyProgressSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-full" />
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={`w-full sm:w-[240px] justify-start text-left font-normal ${!selectedDate && "text-muted-foreground"}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="border rounded-xl border-white/10 overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[800px]">
                      <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                        <tr>
                          <th className="p-4 whitespace-nowrap">Work Order No</th>
                          <th className="p-4 whitespace-nowrap">Planned Labour</th>
                          <th className="p-4 whitespace-nowrap">Actual Labour</th>
                          <th className="p-4 whitespace-nowrap">Planned Work</th>
                          <th className="p-4 whitespace-nowrap">Actual Work</th>
                          <th className="p-4 whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {workOrders.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-muted-foreground">
                              No work orders found
                            </td>
                          </tr>
                        ) : (
                          workOrders.filter(wo => {
                            if (dailyProgressSearch && !wo.workOrderNumber?.toLowerCase().includes(dailyProgressSearch.toLowerCase())) {
                              return false;
                            }
                            if (!selectedDate) return true;

                            const workItem = wo.workItems?.[0] || {};
                            const startDate = new Date(workItem.workStartDate);
                            const endDate = new Date(workItem.workFinishDate);

                            // Check if selected date is within the work range
                            // Or if the Work Order was created on that date
                            // Reset time parts for accurate date comparison
                            const checkDate = new Date(selectedDate);
                            checkDate.setHours(0, 0, 0, 0);

                            const start = new Date(startDate);
                            start.setHours(0, 0, 0, 0);

                            const end = new Date(endDate);
                            end.setHours(23, 59, 59, 999);

                            return checkDate >= start && checkDate <= end;
                          }).map((wo) => {
                            const completion = workCompletions.find(wc => wc.workOrderNumber === wo.workOrderNumber);
                            const isCompleted = !!completion;
                            const workItem = wo.workItems?.[0] || {};

                            // Calculate status
                            const today = new Date();
                            const finishDate = new Date(workItem.workFinishDate);
                            const isDelayed = !isCompleted && today > finishDate;

                            let statusColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                            let statusText = "In Progress";

                            if (isCompleted) {
                              statusColor = "bg-green-500/10 text-green-400 border-green-500/20";
                              statusText = "Completed";
                            } else if (isDelayed) {
                              statusColor = "bg-red-500/10 text-red-400 border-red-500/20";
                              statusText = "Delayed";
                            }

                            return (
                              <tr key={wo._id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-medium text-foreground">
                                  {wo.workOrderNumber}
                                </td>
                                <td className="p-4 text-muted-foreground">
                                  {workItem.plannedLabour || "-"}
                                </td>
                                <td className="p-4 text-muted-foreground">
                                  {/* Actual labour is not currently tracked per work order, placeholder for now */}
                                  -
                                </td>
                                <td className="p-4 text-foreground">
                                  {workItem.workArea ? `${workItem.workArea} SqFt` : (workItem.workDescription || "-")}
                                </td>
                                <td className="p-4 text-foreground">
                                  {completion?.workExecutionRows?.[0]?.actual || "-"}
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-1 rounded-md text-xs border ${statusColor} font-medium`}>
                                    {statusText}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Material Consumption Section */}
              <div className="glass-card p-6 md:p-8">
                <div className="mb-6">
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">Material Consumption</h3>
                  <p className="text-muted-foreground text-sm">Total materials used {selectedDate ? `on ${format(selectedDate, "dd/MM/yyyy")}` : "across all projects"}</p>
                </div>

                <div className="border rounded-xl border-white/10 overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                      <tr>
                        <th className="p-4 whitespace-nowrap">Material Name</th>
                        <th className="p-4 whitespace-nowrap">Total Quantity</th>
                        <th className="p-4 whitespace-nowrap">Unit</th>
                        <th className="p-4 whitespace-nowrap">Work Order Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {(() => {
                        // Aggregate materials from Daily Deployment Entries
                        const filteredEntries = entries.filter(entry => {
                          if (!selectedDate) return true;
                          const entryDate = new Date(entry.date);
                          const checkDate = new Date(selectedDate);

                          // Compare by YYYY-MM-DD
                          return entryDate.getDate() === checkDate.getDate() &&
                            entryDate.getMonth() === checkDate.getMonth() &&
                            entryDate.getFullYear() === checkDate.getFullYear();
                        });

                        const materialMap = new Map();

                        filteredEntries.forEach(entry => {
                          if (entry.materialConsumption && Array.isArray(entry.materialConsumption)) {
                            entry.materialConsumption.forEach(mat => {
                              // materialName, totalQuantity, unit, workOrderReference
                              const key = `${mat.materialName}-${mat.unit}`;
                              if (!materialMap.has(key)) {
                                materialMap.set(key, {
                                  name: mat.materialName,
                                  quantity: 0,
                                  unit: mat.unit,
                                  refs: new Set()
                                });
                              }
                              const item = materialMap.get(key);
                              item.quantity += Number(mat.totalQuantity) || 0;
                              if (mat.workOrderReference) item.refs.add(mat.workOrderReference);
                            });
                          }
                        });


                        // Also include mock data if empty for demo purposes (optional)
                        if (materialMap.size === 0 && filteredEntries.length === 0) {
                          return (
                            <tr>
                              <td colSpan="4" className="p-8 text-center text-muted-foreground">
                                No material consumption recorded for this period.
                              </td>
                            </tr>
                          );
                        }

                        return Array.from(materialMap.values()).map((mat, index) => (
                          <tr key={index} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-medium text-foreground">{mat.name}</td>
                            <td className="p-4 text-foreground">{mat.quantity}</td>
                            <td className="p-4 text-muted-foreground">{mat.unit}</td>
                            <td className="p-4 text-xs text-muted-foreground max-w-xs truncate" title={Array.from(mat.refs).join(", ")}>
                              {Array.from(mat.refs).join(", ")}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>


            </motion.div>
          )}

          {activeTab === 'indent' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-full mx-auto"
            >
              {showIndentForm || editingIndent ? (
                // Indent Form view
                <div className="glass-card shadow-lg p-6 md:p-8 rounded-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                    <h3 className="text-lg font-semibold">{(editingIndent && editingIndent._id) ? "Edit Indent" : "New Indent / Site Requirement"}</h3>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setShowIndentForm(false);
                      setEditingIndent(null);
                    }} className="hover:bg-red-500/10 hover:text-red-400 -mr-2">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back to Indents
                    </Button>
                  </div>
                  <IndentForm
                    initialData={editingIndent}
                    tasks={tasks}
                    onSuccess={() => {
                      setShowIndentForm(false);
                      setEditingIndent(null);
                      fetchIndents(1, false);
                    }}
                    onCancel={() => {
                      setShowIndentForm(false);
                      setEditingIndent(null);
                    }}
                  />
                </div>
              ) : (
                // Indent List view
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Indent / Site Requirements</h3>
                      <p className="text-muted-foreground text-sm mt-1">Manage and track material requests</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="relative w-full sm:max-w-xs">
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                      <input
                        type="text"
                        placeholder="Search Indent No, User, Site..."
                        value={indentSearch}
                        onChange={(e) => setIndentSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                      />
                    </div>
                    <div className="flex w-full sm:w-auto gap-3">
                      <select
                        value={indentFilterPriority}
                        onChange={(e) => setIndentFilterPriority(e.target.value)}
                        className="flex-1 sm:flex-none py-2 px-3 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground cursor-pointer appearance-none"
                        style={{ WebkitAppearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto', paddingRight: '2rem' }}
                      >
                        <option value="all" className="bg-[#1e1e2d] text-foreground">All Priorities</option>
                        <option value="High" className="bg-[#1e1e2d] text-red-400">High Priority</option>
                        <option value="Medium" className="bg-[#1e1e2d] text-yellow-400">Medium Priority</option>
                        <option value="Low" className="bg-[#1e1e2d] text-blue-400">Low Priority</option>
                      </select>
                      <select
                        value={indentFilterStatus}
                        onChange={(e) => setIndentFilterStatus(e.target.value)}
                        className="flex-1 sm:flex-none py-2 px-3 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground cursor-pointer appearance-none"
                        style={{ WebkitAppearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto', paddingRight: '2rem' }}
                      >
                        <option value="all" className="bg-[#1e1e2d] text-foreground">All Status</option>
                        <option value="pending" className="bg-[#1e1e2d] text-yellow-400">Pending</option>
                        <option value="verified" className="bg-[#1e1e2d] text-blue-400">Verified</option>
                        <option value="approved_ho" className="bg-[#1e1e2d] text-green-400">Admin Approved</option>
                        <option value="rejected" className="bg-[#1e1e2d] text-red-400">Rejected</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                        <tr>
                          <th className="p-4 whitespace-nowrap">Task Ref</th>
                          <th className="p-4 whitespace-nowrap">Indent No.</th>
                          <th className="p-4 whitespace-nowrap">Created By</th>
                          <th className="p-4 whitespace-nowrap">Date</th>
                          <th className="p-4 whitespace-nowrap">Site Name</th>
                          <th className="p-4 whitespace-nowrap">Site Engineer</th>
                          <th className="p-4 whitespace-nowrap">Material Group</th>
                          <th className="p-4 whitespace-nowrap">Priority</th>
                          <th className="p-4 whitespace-nowrap">Items</th>
                          <th className="p-4 whitespace-nowrap">Verification</th>
                          <th className="p-4 whitespace-nowrap text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {(() => {
                          const q = indentSearch.toLowerCase();
                          const filtered = indents.filter(indent => {
                            const matchSearch = !q || indent.indentNumber?.toLowerCase().includes(q) || indent.siteName?.toLowerCase().includes(q) || indent.siteEngineerName?.toLowerCase().includes(q) || indent.taskReference?.toLowerCase().includes(q) || indent.materialGroup?.toLowerCase().includes(q);
                            const matchPriority = indentFilterPriority === 'all' || indent.priority === indentFilterPriority;
                            const matchStatus = indentFilterStatus === 'all' || (indentFilterStatus === 'verified' ? indent.verifiedByPurchaseManager : !indent.verifiedByPurchaseManager);
                            return matchSearch && matchPriority && matchStatus;
                          });
                          if (filtered.length === 0) return <tr><td colSpan="10" className="p-8 text-center text-muted-foreground">{indents.length === 0 ? 'No indents submitted yet.' : 'No indents match your search or filter.'}</td></tr>;
                          return filtered.map((indent) => (
                            <tr key={indent._id} className="hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                {indent.taskReference ? (
                                  <span className="px-2 py-1 rounded-md text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {indent.taskReference}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                              <td className="p-4 font-mono text-foreground">{indent.indentNumber}</td>
                              <td className="p-4 text-foreground">{indent.createdBy?.fullName || indent.createdBy?.email || 'Unknown'}</td>
                              <td className="p-4 text-muted-foreground">{format(new Date(indent.createdAt || indent.date), 'dd/MM/yyyy hh:mm:ss a')}</td>
                              <td className="p-4 text-foreground">{indent.siteName}</td>
                              <td className="p-4 text-foreground">{indent.siteEngineerName}</td>
                              <td className="p-4 text-foreground">{indent.materialGroup}</td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-md text-xs font-medium border ${indent.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  indent.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                    indent.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                      'bg-green-500/10 text-green-400 border-green-500/20'
                                  }`}>
                                  {indent.priority}
                                </span>
                              </td>
                              <td className="p-4 text-foreground">{indent.items?.length || 0} items</td>
                              <td className="p-4 text-center">
                                {indent.verifiedByPurchaseManager ? (
                                  <span className="px-2 py-1 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20" title={indent.verifiedBy?.fullName || "Verified"}>
                                    <ClipboardCheck className="w-3 h-3" />
                                    {indent.verifiedBy?.fullName || indent.verifiedBy?.email ? (
                                      <span className="truncate max-w-[100px]">{indent.verifiedBy.fullName || indent.verifiedBy.email}</span>
                                    ) : (
                                      "Verified"
                                    )}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedIndent(indent);
                                      setIsIndentViewOpen(true);
                                    }}
                                    className="p-1.5 hover:bg-white/20 rounded-lg text-blue-400 transition-colors"
                                    title="View Requirements"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {(user?.role === 'admin' || user?.role === 'purchase_manager') && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setVerifyingIndent(indent);
                                          setVerifyFormData({
                                            verifiedByPurchaseManager: indent.verifiedByPurchaseManager || false,
                                            verifiedPdf: null
                                          });
                                          setIsVerifyIndentOpen(true);
                                        }}
                                        className="p-1.5 hover:bg-white/20 rounded-lg text-green-400 transition-colors"
                                        title="Verify Indent"
                                      >
                                        <ClipboardCheck className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          // Set active tab to purchase-order
                                          setActiveTab('purchase-order');
                                          // Set editing purchase order data
                                          setEditingPurchaseOrder({
                                            indentReference: indent,
                                            taskReference: indent.taskReference || "",
                                            shipToAddress: indent.siteName || "",
                                            shipToContactPerson: indent.siteEngineerName || "",
                                            items: indent.items?.map(item => ({
                                              materialDescription: item.description || item.materialDescription || "",
                                              unit: item.unit || "",
                                              quantity: item.orderQuantity || item.requiredQuantity || item.approvedQuantity || item.quantity || "",
                                              rate: "",
                                              baseAmount: 0,
                                              taxRate: "18",
                                              taxAmount: 0,
                                              amount: 0
                                            })) || []
                                          });
                                          // Open PO form after a small delay to ensure the tab has rendered
                                          setTimeout(() => {
                                            setShowPurchaseOrderForm(true);
                                          }, 50);
                                        }}
                                        className="p-1.5 flex items-center gap-1 hover:bg-white/20 rounded-lg text-emerald-400 transition-colors bg-emerald-500/10 border border-emerald-500/20 px-2 ml-1"
                                        title="Create Purchase Order"
                                      >
                                        <ShoppingCart className="w-3.5 h-3.5" />
                                        <span className="text-xs font-medium">PO</span>
                                      </button>
                                    </>
                                  )}
                                  {isAdmin && (
                                    <button
                                      onClick={() => setEditingIndent(indent)}
                                      className="p-1.5 hover:bg-white/20 rounded-lg text-secondary transition-colors"
                                      title="Edit Indent"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button
                                      onClick={() => setIndentToDelete(indent)}
                                      className="p-1.5 hover:bg-white/20 rounded-lg text-red-400 transition-colors"
                                      title="Delete Indent"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Load More Pagination */}
                  {(hasMoreIndents || isIndentsLoadingMore) && (
                    <div className="p-4 flex justify-center mt-4 border-t border-white/5">
                      <Button
                        variant="outline"
                        onClick={loadMoreIndents}
                        disabled={isIndentsLoadingMore}
                        className="bg-white/5 border border-white/10 hover:bg-white/10 min-w-[200px] text-primary"
                      >
                        {isIndentsLoadingMore ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          'Load More Indents'
                        )}
                      </Button>
                    </div>
                  )}

                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'purchase-order' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-full mx-auto"
            >
              {showPurchaseOrderForm || editingPurchaseOrder ? (
                // Form view
                <div className="glass-card shadow-lg p-6 md:p-8 rounded-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                    <h3 className="text-lg font-semibold">{editingPurchaseOrder?._id ? "Edit Purchase Order" : "New Purchase Order"}</h3>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setShowPurchaseOrderForm(false);
                      setEditingPurchaseOrder(null);
                    }} className="hover:bg-red-500/10 hover:text-red-400 -mr-2">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                  </div>
                  <PurchaseOrderForm
                    initialData={editingPurchaseOrder}
                    onSuccess={() => {
                      setShowPurchaseOrderForm(false);
                      setEditingPurchaseOrder(null);
                      fetchPurchaseOrders(1, false);
                    }}
                    onCancel={() => {
                      setShowPurchaseOrderForm(false);
                      setEditingPurchaseOrder(null);
                    }}
                  />
                </div>
              ) : (
                // List view
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-foreground">Purchase Orders</h3>
                      <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">Manage Purchase Orders and Vendor Details</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="relative w-full sm:max-w-xs">
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                      <input
                        type="text"
                        placeholder="Search PO No, Vendor, Task..."
                        value={purchaseOrderSearch}
                        onChange={(e) => setPurchaseOrderSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                      />
                    </div>
                    <div className="flex w-full sm:w-auto gap-3">
                      <select
                        value={purchaseOrderFilterStatus}
                        onChange={(e) => setPurchaseOrderFilterStatus(e.target.value)}
                        className="flex-1 sm:flex-none py-2 px-4 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground cursor-pointer appearance-none"
                        style={{ WebkitAppearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto', paddingRight: '2rem' }}
                      >
                        <option value="all" className="bg-[#1e1e2d] text-foreground">All Status</option>
                        <option value="Pending" className="bg-[#1e1e2d] text-yellow-400">Pending</option>
                        <option value="Approved" className="bg-[#1e1e2d] text-green-400">Approved</option>
                        <option value="Rejected" className="bg-[#1e1e2d] text-red-400">Rejected</option>
                      </select>
                    </div>
                  </div>
                  <PurchaseOrdersList
                    purchaseOrders={purchaseOrders}
                    hasMore={hasMorePurchaseOrders}
                    isLoadingMore={isPurchaseOrdersLoadingMore}
                    onLoadMore={loadMorePurchaseOrders}
                    searchQuery={purchaseOrderSearch}
                    filterStatus={purchaseOrderFilterStatus}
                    isAdmin={isAdmin}
                    canUpload={canCreatePO}
                    onEdit={(po) => {
                      setEditingPurchaseOrder(po);
                      setShowPurchaseOrderForm(true);
                    }}
                    canChangeStatus={canChangePurchaseOrderStatus}
                    onStatusChange={(id, status) => updatePurchaseOrderStatusMutation.mutate({ id, status })}
                    onDelete={(id) => {
                      deletePurchaseOrderMutation.mutate(id);
                    }}
                    onNavigateToVerification={(id) => {
                      setActiveTab('material-verification');
                      setHighlightedVerificationPoId(id);
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'material-verification' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-full mx-auto"
            >
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-foreground">Material Verification Certificate</h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">Track and enter received material quantities against Purchase Orders</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="relative w-full sm:max-w-xs">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    <input
                      type="text"
                      placeholder="Search PO No, Vendor..."
                      value={purchaseOrderSearch}
                      onChange={(e) => setPurchaseOrderSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                    />
                  </div>
                  <div className="flex w-full sm:w-auto gap-3">
                    <select
                      value={purchaseOrderFilterStatus}
                      onChange={(e) => setPurchaseOrderFilterStatus(e.target.value)}
                      className="flex-1 sm:flex-none py-2 px-4 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground cursor-pointer appearance-none"
                      style={{ WebkitAppearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto', paddingRight: '2rem' }}
                    >
                      <option value="all" className="bg-[#1e1e2d] text-foreground">All Status</option>
                      <option value="Pending" className="bg-[#1e1e2d] text-zinc-400">Pending</option>
                      <option value="Partial" className="bg-[#1e1e2d] text-yellow-400">Partial</option>
                      <option value="Verified" className="bg-[#1e1e2d] text-green-400">Verified</option>
                    </select>
                  </div>
                </div>

                <MaterialVerificationsList
                  purchaseOrders={purchaseOrders}
                  searchQuery={purchaseOrderSearch}
                  filterStatus={purchaseOrderFilterStatus}
                  isAdmin={isAdmin}
                  canEdit={isAdmin || isSiteEngineer || isPurchaseManager}
                  onVerificationSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
                  }}
                  highlightedPoId={highlightedVerificationPoId}
                  onClearHighlight={() => setHighlightedVerificationPoId(null)}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-full mx-auto"
            >
              {showTaskForm && isTaskManager ? (
                <div className="glass-card p-6 md:p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Assign New Task</h3>
                    <Button variant="ghost" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                  </div>
                  <TaskForm
                    onSuccess={() => {
                      setShowTaskForm(false);
                      queryClient.invalidateQueries({ queryKey: ['tasks'] });
                    }}
                    onCancel={() => setShowTaskForm(false)}
                  />
                </div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Project Tasks</h3>
                      <p className="text-muted-foreground text-sm mt-0.5">All assigned project tasks and their status</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        onClick={() => {
                          try {
                            const exportedTasks = tasks.filter(t => {
                              const matchSearch = t.taskId?.toLowerCase().includes(taskSearch.toLowerCase()) ||
                                t.workParticulars?.toLowerCase().includes(taskSearch.toLowerCase()) ||
                                t.contractorName?.toLowerCase().includes(taskSearch.toLowerCase());
                              const matchStatus = taskFilterStatus === 'all' || t.status === taskFilterStatus;
                              return matchSearch && matchStatus;
                            });

                            if (exportedTasks.length === 0) {
                              toast.error("No tasks found to export with current filters.");
                              return;
                            }
                            generateTaskPDF(exportedTasks);
                          } catch (error) {
                            console.error("PDF Export Error: ", error);
                            toast.error("Failed to generate PDF");
                          }
                        }}
                        size="sm"
                        variant="outline"
                        className="gap-2 text-xs"
                      >
                        <Download className="w-4 h-4" />
                        Export PDF
                      </Button>
                      <div className="relative">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input type="text" placeholder="Search task ID, work, contractor…" value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-full sm:w-52" />
                      </div>
                      <select value={taskFilterStatus} onChange={(e) => setTaskFilterStatus(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                        <option value="all">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Delayed">Delayed</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                        <tr>
                          <th className="p-4 whitespace-nowrap">Task ID</th>
                          <th className="p-4 whitespace-nowrap">Timestamp</th>
                          <th className="p-4 whitespace-nowrap">Work Particulars</th>
                          <th className="p-4 whitespace-nowrap">Assigned To (Contractor)</th>
                          <th className="p-4 whitespace-nowrap">Planned Start</th>
                          <th className="p-4 whitespace-nowrap">Planned Finish</th>
                          <th className="p-4 whitespace-nowrap">Duration</th>
                          <th className="p-4 whitespace-nowrap">Assigned By</th>
                          <th className="p-4 whitespace-nowrap">Status</th>
                          <th className="p-4 whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {(() => {
                          if (isTasksLoading) return (
                            <tr>
                              <td colSpan="10" className="p-8 text-center text-muted-foreground">
                                Loading tasks…
                              </td>
                            </tr>
                          );
                          const q = taskSearch.toLowerCase();
                          const filtered = tasks.filter(task => {
                            const matchSearch = !q || task.taskId?.toLowerCase().includes(q) || task.workParticulars?.toLowerCase().includes(q) || task.contractor?.name?.toLowerCase().includes(q) || task.contractorName?.toLowerCase().includes(q) || task.projectManager?.fullName?.toLowerCase().includes(q);
                            const matchStatus = taskFilterStatus === 'all' || task.status === taskFilterStatus;
                            return matchSearch && matchStatus;
                          });
                          if (filtered.length === 0) return (
                            <tr>
                              <td colSpan="10" className="p-8 text-center text-muted-foreground">
                                {tasks.length === 0 ? 'No tasks assigned yet.' : 'No tasks match your search or filter.'}
                              </td>
                            </tr>
                          );
                          return filtered.map((task) => (
                            <tr key={task._id} className="hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                <span className="px-2 py-1 rounded-md text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {task.taskId || '—'}
                                </span>
                              </td>
                              <td className="p-4 text-muted-foreground whitespace-nowrap">
                                {task.createdAt ? format(new Date(task.createdAt), 'dd/MM/yyyy hh:mm:ss a') : '—'}
                              </td>
                              <td className="p-4 font-medium text-foreground">{task.workParticulars || '—'}</td>
                              <td className="p-4 text-foreground">{task.contractor?.name || task.contractorName || 'Unknown'}</td>
                              <td className="p-4 text-muted-foreground whitespace-nowrap">
                                {task.plannedStartDate ? format(new Date(task.plannedStartDate), 'dd/MM/yyyy') : '—'}
                              </td>
                              <td className="p-4 text-muted-foreground whitespace-nowrap">
                                {task.plannedFinishDate ? format(new Date(task.plannedFinishDate), 'dd/MM/yyyy') : '—'}
                              </td>
                              <td className="p-4 text-foreground">{task.duration || '—'}</td>
                              <td className="p-4 text-foreground">{task.projectManager?.fullName || task.projectManager?.email || 'Unknown'}</td>
                              <td className="p-4">
                                {isTaskManager ? (
                                  <Select
                                    defaultValue={task.status}
                                    onValueChange={(value) => updateTaskMutation.mutate({ id: task._id, status: value })}
                                  >
                                    <SelectTrigger className={`w-[130px] h-8 text-xs ${task.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                      task.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                      }`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Pending">Pending</SelectItem>
                                      <SelectItem value="In Progress">In Progress</SelectItem>
                                      <SelectItem value="Completed">Completed</SelectItem>
                                      <SelectItem value="Delayed">Delayed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${task.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                    task.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                      task.status === 'Delayed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                    }`}>
                                    {task.status}
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setActiveTab('indent');
                                      setShowIndentForm(true);
                                      setEditingIndent({ taskReference: task.taskId || task._id });
                                    }}
                                    className="p-1.5 flex items-center gap-1 hover:bg-white/20 rounded-lg text-emerald-400 transition-colors bg-emerald-500/10 border border-emerald-500/20 px-2"
                                    title="Create Indent"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">Indent</span>
                                  </button>
                                  {isAdmin && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingTask(task);
                                          setEditTaskForm({
                                            workParticulars: task.workParticulars,
                                            contractorInput: task.contractor?.name || task.contractorName || '',
                                            plannedStartDate: task.plannedStartDate?.slice(0, 10) || '',
                                            plannedFinishDate: task.plannedFinishDate?.slice(0, 10) || '',
                                            duration: task.duration,
                                            status: task.status,
                                          });
                                        }}
                                        className="p-1.5 hover:bg-white/20 rounded-lg text-blue-400 transition-colors"
                                        title="Edit Task"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setTaskToDelete(task)}
                                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                        title="Delete Task"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Load More Pagination */}
                  {(hasMoreTasks || isTasksLoadingMore) && (
                    <div className="p-4 border-t border-white/10 flex justify-center bg-white/5 mt-4 rounded-xl">
                      <Button
                        variant="outline"
                        onClick={loadMoreTasks}
                        disabled={isTasksLoadingMore}
                        className="bg-white/5 border-white/10 hover:bg-white/10 min-w-[150px]"
                      >
                        {isTasksLoadingMore ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          'Load More Tasks'
                        )}
                      </Button>
                    </div>
                  )}

                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'master-tracking' && (
            <motion.div
              key="master-tracking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              <MasterTracking
                tasks={tasks}
                indents={indents}
                purchaseOrders={purchaseOrders}
                materialVerifications={purchaseOrders}
                workOrders={workOrders}
                entries={entries}
                workCompletions={workCompletions}
              />
            </motion.div>
          )}

          {activeTab === 'site-lookups' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between sm:items-end">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Global Dropdowns</h3>
                    <p className="text-muted-foreground text-sm mt-1">Manage options for indents and general forms</p>
                  </div>
                  <div className="flex bg-white/5 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveLookupTab('siteName')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeLookupTab === 'siteName' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Site Names
                    </button>
                    <button
                      onClick={() => setActiveLookupTab('siteEngineer')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeLookupTab === 'siteEngineer' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Engineers
                    </button>
                    <button
                      onClick={() => setActiveLookupTab('materialGroup')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeLookupTab === 'materialGroup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Materials
                    </button>
                    <button
                      onClick={() => setActiveLookupTab('vendor')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeLookupTab === 'vendor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Vendors
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                        <tr>
                          <th className="p-4 whitespace-nowrap">Value</th>
                          <th className="p-4 whitespace-nowrap text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {(activeLookupTab === 'siteName' ? siteNames : activeLookupTab === 'siteEngineer' ? siteEngineers : activeLookupTab === 'vendor' ? vendors : materialGroups).length === 0 ? (
                          <tr>
                            <td colSpan="2" className="p-8 text-center text-muted-foreground">No items found.</td>
                          </tr>
                        ) : (
                          (activeLookupTab === 'siteName' ? siteNames : activeLookupTab === 'siteEngineer' ? siteEngineers : activeLookupTab === 'vendor' ? vendors : materialGroups).map((item) => (
                            <tr key={item._id} className="hover:bg-white/5 transition-colors group">
                              <td className="p-4 text-foreground font-medium">{item.value}</td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEditLookup(item)}
                                    className="p-1.5 hover:bg-white/20 rounded-lg text-blue-400 transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLookup(item)}
                                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'contractors' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Contractors</h3>
                  <p className="text-muted-foreground text-sm">Manage all contractors and their details</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                  <input type="text" placeholder="Search contractor name or ID…" value={contractorSearch} onChange={(e) => setContractorSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-full" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {contractors.filter(c => !contractorSearch || c.name.toLowerCase().includes(contractorSearch.toLowerCase()) || c._id.toLowerCase().includes(contractorSearch.toLowerCase())).map((contractor) => (
                  <div key={contractor._id} className="flex flex-col p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group relative overflow-hidden">
                    {isAdmin && (
                      <div className="absolute top-0 right-0 p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1 bg-black/50 backdrop-blur-sm rounded-bl-xl">
                        <button onClick={() => handleEditContractor(contractor)} className="p-1.5 hover:bg-white/20 rounded-lg text-blue-400">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteContractor(contractor._id)} className="p-1.5 hover:bg-white/20 rounded-lg text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-3 text-primary">
                      <span className="font-bold text-lg">{contractor.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <h3 className="font-medium text-foreground text-lg truncate" title={contractor.name}>{contractor.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Contractor ID: {contractor._id.slice(-4)}</p>
                  </div>
                ))}

                {isAdmin && (
                  <button
                    onClick={handleOpenAddDialog}
                    className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all group min-h-[150px]"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-primary/20 flex items-center justify-center mb-3 transition-colors">
                      <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <span className="font-medium text-muted-foreground group-hover:text-primary">Add New Contractor</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              <UserManagement />
            </motion.div>
          )}

          {activeTab === 'integrations' && isAdmin && (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Google Sheets Integration
                </h2>
                <p className="text-muted-foreground mt-1">Connect each module to a Google Sheet for real-time sync.</p>
              </div>

              {/* Setup Instructions */}
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <h4 className="font-medium text-primary mb-2 flex items-center gap-2"><Link2 className="w-4 h-4" /> Setup Instructions</h4>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Create a blank Google Sheet for each module you want to sync.</li>
                  <li>Copy the Spreadsheet ID from the URL: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">/spreadsheets/d/<span className="text-primary font-bold">SPREADSHEET_ID</span>/edit</code></li>
                  <li>Paste it in the field below for the corresponding module.</li>
                  <li className="text-amber-400 font-medium">Share each sheet with your Service Account email (Editor access).</li>
                </ol>
              </div>

              {/* One card per module */}
              {SHEET_MODULES.map((mod) => {
                const ids = sheetIds[mod.key] || [];
                const input = sheetInputs[mod.key] || '';
                const saving = sheetSaving[mod.key] || false;
                return (
                  <div key={mod.key} className="bg-card border rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b bg-muted/20 flex items-center gap-3">
                      <div className="p-2 bg-[#0F9D58]/10 rounded-lg">
                        <Link2 className="w-5 h-5 text-[#0F9D58]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{mod.label}</h3>
                        <p className="text-xs text-muted-foreground">{mod.description}</p>
                      </div>
                      {ids.length > 0 && (
                        <span className="ml-auto text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                          {ids.length} sheet{ids.length > 1 ? 's' : ''} linked
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      {ids.length > 0 ? (
                        <div className="space-y-2">
                          {ids.map((id, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                              <span className="font-mono text-xs text-foreground truncate mr-3">{id}</span>
                              <button
                                onClick={() => handleRemoveSheetId(mod.key, mod.settingKey, id)}
                                disabled={saving}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 rounded-md transition-colors shrink-0"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic text-center py-2">No sheet linked yet.</p>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setSheetInputs(prev => ({ ...prev, [mod.key]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSheetId(mod.key, mod.settingKey)}
                          placeholder="Paste Spreadsheet ID here…"
                          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                        <button
                          onClick={() => handleAddSheetId(mod.key, mod.settingKey)}
                          disabled={saving || !input.trim()}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                        >
                          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus className="w-3.5 h-3.5" /> Add</>}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'logs' && isSuperAdmin && (
            <LogsPanel />
          )}

          {activeTab === 'bills' && (
            <BillsList isAdmin={isAdmin} />
          )}

          {activeTab === 'payment-vouchers' && (
            <PaymentVouchersList isAdmin={isAdmin} />
          )}
        </div>
      </main >

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContractor ? "Edit Contractor" : "Add New Contractor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContractorSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contractor/Supplier Name</label>
              <Input
                placeholder="Enter name..."
                value={newContractorName}
                onChange={(e) => setNewContractorName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createContractorMutation.isPending || updateContractorMutation.isPending}>
                {editingContractor ? "Update" : "Add Contractor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isLookupDialogOpen} onOpenChange={setIsLookupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLookup ? 'Edit' : 'Add'} {activeLookupTab === 'siteName' ? 'Site Name' : activeLookupTab === 'siteEngineer' ? 'Site Engineer' : activeLookupTab === 'vendor' ? 'Vendor' : 'Material Group'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLookupSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {activeLookupTab === 'vendor' ? 'Vendor Name' : 'Value'}
              </label>
              <Input
                autoFocus
                value={newLookupValue}
                onChange={(e) => setNewLookupValue(e.target.value)}
                placeholder={activeLookupTab === 'siteName' ? "e.g., 'Site A'" : activeLookupTab === 'siteEngineer' ? "Name" : activeLookupTab === 'vendor' ? "Vendor Name" : "Material"}
              />
            </div>

            {activeLookupTab === 'vendor' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Vendor Address</label>
                  <Input
                    value={newVendorAddress}
                    onChange={(e) => setNewVendorAddress(e.target.value)}
                    placeholder="Address"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Vendor GST No.</label>
                  <Input
                    value={newVendorGst}
                    onChange={(e) => setNewVendorGst(e.target.value)}
                    placeholder="GST Number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Vendor Contact No.</label>
                  <Input
                    value={newVendorContactNo}
                    onChange={(e) => setNewVendorContactNo(e.target.value)}
                    placeholder="Contact Number"
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLookupDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newLookupValue.trim() || createLookupMutation.isPending || updateLookupMutation.isPending}>
                {createLookupMutation.isPending || updateLookupMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit Task — <span className="text-blue-400 font-mono text-sm">{editingTask?.taskId}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Work Particulars</label>
              <Input
                value={editTaskForm.workParticulars || ''}
                onChange={(e) => setEditTaskForm(p => ({ ...p, workParticulars: e.target.value }))}
                placeholder="Work description"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Contractor</label>
              <div className="relative">
                <Input
                  list="edit-contractor-suggestions"
                  value={editTaskForm.contractorInput || ''}
                  onChange={(e) => setEditTaskForm(p => ({ ...p, contractorInput: e.target.value }))}
                  placeholder="Type or select contractor"
                  autoComplete="off"
                />
                <datalist id="edit-contractor-suggestions">
                  {contractors.map(c => (
                    <option key={c._id} value={c.name} />
                  ))}
                </datalist>
              </div>
              {editTaskForm.contractorInput?.trim() && !contractors.find(c => c.name.toLowerCase() === editTaskForm.contractorInput.trim().toLowerCase()) && (
                <p className="text-[11px] text-amber-400/80 mt-1">
                  ⚠ New contractor — will be saved as free text
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Planned Start</label>
                <input
                  type="date"
                  value={editTaskForm.plannedStartDate || ''}
                  onChange={(e) => {
                    const start = e.target.value;
                    const finish = editTaskForm.plannedFinishDate;
                    const days = start && finish
                      ? Math.max(0, Math.round((new Date(finish) - new Date(start)) / 86400000))
                      : '';
                    setEditTaskForm(p => ({ ...p, plannedStartDate: start, duration: days ? `${days} day${days === 1 ? '' : 's'}` : '' }));
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Planned Finish</label>
                <input
                  type="date"
                  value={editTaskForm.plannedFinishDate || ''}
                  onChange={(e) => {
                    const finish = e.target.value;
                    const start = editTaskForm.plannedStartDate;
                    const days = start && finish
                      ? Math.max(0, Math.round((new Date(finish) - new Date(start)) / 86400000))
                      : '';
                    setEditTaskForm(p => ({ ...p, plannedFinishDate: finish, duration: days ? `${days} day${days === 1 ? '' : 's'}` : '' }));
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Duration</label>
                <Input
                  value={editTaskForm.duration || 'Select dates above'}
                  readOnly
                  className="opacity-60 cursor-not-allowed bg-white/5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Select
                  value={editTaskForm.status || 'Pending'}
                  onValueChange={(v) => setEditTaskForm(p => ({ ...p, status: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Delayed">Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button
              disabled={updateTaskMutation.isPending}
              onClick={() => {
                // Match contractorInput against existing contractors
                const trimmed = (editTaskForm.contractorInput || '').trim();
                const matched = contractors.find(c => c.name.toLowerCase() === trimmed.toLowerCase());

                const payload = {
                  ...editTaskForm,
                  contractor: matched?._id || null, // send null if not matched so it unsets old ref
                  contractorName: trimmed,
                };
                delete payload.contractorInput; // remove the UI-only field

                updateTaskMutation.mutate(
                  { id: editingTask._id, ...payload },
                  { onSuccess: () => setEditingTask(null), onError: () => setEditingTask(null) }
                );
              }}
            >
              {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Delete Confirmation Modal */}
      <Dialog open={!!taskToDelete} onOpenChange={(open) => { if (!open) setTaskToDelete(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Delete Task
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-muted-foreground text-sm">
              Are you sure you want to delete the task:
            </p>
            <p className="mt-2 font-semibold text-foreground">
              &ldquo;{taskToDelete?.workParticulars}&rdquo;
            </p>
            <p className="mt-2 text-xs text-red-400/80">This action cannot be undone.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTaskToDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTaskMutation.mutate(taskToDelete._id)}
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Indent Delete Confirmation Modal */}
      <Dialog open={!!indentToDelete} onOpenChange={(open) => { if (!open) setIndentToDelete(null); }}>
        <DialogContent className="sm:max-w-md bg-[#1a1c23] border border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Delete Indent Requirement
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-muted-foreground text-sm">
              Are you sure you want to delete this indent:
            </p>
            <p className="mt-2 font-mono text-foreground font-semibold">
              {indentToDelete?.indentNumber}
            </p>
            <p className="mt-2 text-xs text-red-400/80">This action cannot be undone and will permanently remove this record.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIndentToDelete(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteIndentMutation.mutate(indentToDelete._id)}
              disabled={deleteIndentMutation.isPending}
            >
              {deleteIndentMutation.isPending ? 'Deleting...' : 'Delete Indent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Indent View Dialog */}
      <Dialog open={isIndentViewOpen} onOpenChange={setIsIndentViewOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto bg-[#1a1c23] text-foreground border border-white/10">
          <DialogHeader>
            <div className="flex items-start justify-between pr-8">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Indent Requirements
                </DialogTitle>
                <DialogDescription className="text-muted-foreground flex gap-4 text-sm mt-2">
                  <span><strong>Indent No:</strong> {selectedIndent?.indentNumber}</span>
                  <span><strong>Site:</strong> {selectedIndent?.siteName}</span>
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateIndentPDF([selectedIndent])}
                  className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 px-2.5"
                  title="Download PDF"
                >
                  <FileText className="w-4 h-4 mr-1.5" /> PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateIndentExcel([selectedIndent])}
                  className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 px-2.5"
                  title="Download Excel"
                >
                  <Sheet className="w-4 h-4 mr-1.5" /> XLS
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateIndentCSV([selectedIndent])}
                  className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 px-2.5"
                  title="Download CSV"
                >
                  <File className="w-4 h-4 mr-1.5" /> CSV
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-5">
            {/* Basic Information */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 border-b border-white/10 pb-2">Basic Information</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Indent No.', value: selectedIndent?.indentNumber },
                  { label: 'Date', value: selectedIndent?.date ? new Date(selectedIndent.date).toLocaleDateString('en-IN') : '—' },
                  { label: 'Task Reference', value: selectedIndent?.taskReference || '—' },
                  { label: 'Site Name', value: selectedIndent?.siteName || '—' },
                  { label: 'Site Engineer', value: selectedIndent?.siteEngineerName || '—' },
                  { label: 'Material Group', value: selectedIndent?.materialGroup || '—' },
                  { label: 'Priority', value: selectedIndent?.priority || '—' },
                  { label: 'Lead Time', value: selectedIndent?.leadTime ? `${selectedIndent.leadTime} days` : '—' },
                  { label: 'Store Manager', value: selectedIndent?.storeManagerName || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
                    <span className="font-medium text-foreground text-sm">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Work Description & Block/Floor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Work Description</span>
                <span className="font-medium text-foreground text-sm">{selectedIndent?.workDescription || '—'}</span>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Block / Floor / Work</span>
                <span className="font-medium text-foreground text-sm">{selectedIndent?.blockFloorWork || '—'}</span>
              </div>
            </div>

            {/* Material Requirements */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 border-b border-white/10 pb-2">Material Requirements ({selectedIndent?.items?.length || 0} items)</h4>
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                    <tr>
                      <th className="p-3 border-r border-white/10">#</th>
                      <th className="p-3 border-r border-white/10">Material Description</th>
                      <th className="p-3 border-r border-white/10 text-center">Unit</th>
                      <th className="p-3 border-r border-white/10 text-center">Required Qty</th>
                      <th className="p-3 border-r border-white/10 text-center">Order Qty</th>
                      <th className="p-3 text-left">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {selectedIndent?.items?.length === 0 ? (
                      <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">No items listed.</td></tr>
                    ) : (
                      selectedIndent?.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 border-r border-white/10 text-muted-foreground text-xs">{index + 1}</td>
                          <td className="p-3 border-r border-white/10 text-foreground">{item.materialDescription || '—'}</td>
                          <td className="p-3 border-r border-white/10 text-center text-muted-foreground">{item.unit || '—'}</td>
                          <td className="p-3 border-r border-white/10 text-center text-foreground font-semibold">{item.requiredQuantity ?? 0}</td>
                          <td className="p-3 border-r border-white/10 text-center text-muted-foreground">{item.orderQuantity || '—'}</td>
                          <td className="p-3 text-muted-foreground text-xs">{item.remark || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedIndent?.verifiedByPurchaseManager && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-full">
                    <ClipboardCheck className="text-green-500 w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-green-500">Verified by Purchase Manager</h5>
                    <p className="text-xs text-green-500/80">This indent requirement has been reviewed and validated.</p>
                  </div>
                </div>
                {selectedIndent?.verifiedPdfUrl && (
                  <Button
                    variant="outline"
                    className="mt-3 sm:mt-0 bg-transparent border-green-500/30 text-green-500 hover:bg-green-500/10 hover:text-green-400"
                    onClick={async () => {
                      const url = await uploadService.getSignedUrl(selectedIndent.verifiedPdfUrl);
                      if (url) window.open(url, '_blank');
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" /> View Signed Doc
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Indent Verification Dialog */}
      <Dialog open={isVerifyIndentOpen} onOpenChange={setIsVerifyIndentOpen}>
        <DialogContent className="sm:max-w-md bg-[#1a1c23] border border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-400" />
              Verify Indent Requirement
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-1">
              Verify the requirement for Indent <strong>{verifyingIndent?.indentNumber}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('verifiedByPurchaseManager', verifyFormData.verifiedByPurchaseManager);
            if (verifyFormData.verifiedPdf) {
              formData.append('verifiedPdf', verifyFormData.verifiedPdf);
            }
            verifyIndentMutation.mutate({ id: verifyingIndent?._id, formData });
          }}>
            <div className="py-6 space-y-6">
              <label className="flex items-start gap-3 p-4 border border-white/10 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={verifyFormData.verifiedByPurchaseManager}
                  onChange={(e) => setVerifyFormData({ ...verifyFormData, verifiedByPurchaseManager: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-600 focus:ring-offset-gray-800"
                />
                <div>
                  <div className="font-medium text-foreground">Verified by Purchase Manager</div>
                  <div className="text-sm text-muted-foreground">Mark this indent as verified and validated for purchasing process.</div>
                </div>
              </label>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Upload Verified Document (PDF)</label>
                <div className="relative">
                  <Input
                    type="file"
                    accept="application/pdf,image/*"
                    className="bg-white/5 border-white/10 text-foreground file:bg-white/10 file:text-foreground file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 hover:file:bg-white/20"
                    onChange={(e) => setVerifyFormData({ ...verifyFormData, verifiedPdf: e.target.files[0] })}
                  />
                  {verifyingIndent?.verifiedPdfUrl && !verifyFormData.verifiedPdf && (
                    <div className="mt-2 text-xs text-blue-400">
                      Current file: <a
                        href="#"
                        onClick={async (e) => {
                          e.preventDefault();
                          const url = await uploadService.getSignedUrl(verifyingIndent.verifiedPdfUrl);
                          if (url) window.open(url, '_blank');
                        }}
                        rel="noreferrer"
                        className="underline"
                      >View PDF</a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2 border-t border-white/10 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsVerifyIndentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={verifyIndentMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {verifyIndentMutation.isPending ? 'Saving...' : 'Save Verification'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!workOrderToDelete} onOpenChange={() => setWorkOrderToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Work Order
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete the work order <strong className="text-foreground">{workOrderToDelete?.workOrderNumber}</strong>?
            </p>
            <p className="text-sm text-red-400 mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setWorkOrderToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteWorkOrder}>
              Delete Work Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!workCompletionToDelete} onOpenChange={() => setWorkCompletionToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Certification
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete the certification for work order <strong className="text-foreground">#{workCompletionToDelete?.workOrderNumber}</strong>?
            </p>
            <p className="text-sm text-red-400 mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setWorkCompletionToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteWorkCompletion}>
              Delete Certification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Entry Confirmation Dialog */}
      <Dialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Deployment Entry
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete the deployment entry for <strong className="text-foreground">{entryToDelete?.projectName}</strong> on {entryToDelete?.date}?
            </p>
            <p className="text-sm text-red-400 mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEntryToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteEntry}>
              Delete Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modern Confirm Modals for Actions */}
      <ConfirmModal
        isOpen={!!contractorToDelete}
        onClose={() => setContractorToDelete(null)}
        onConfirm={executeDeleteContractor}
        title="Delete Contractor?"
        message="Are you sure you want to delete this contractor? This action cannot be undone."
      />

      <ConfirmModal
        isOpen={!!lookupToDelete}
        onClose={() => setLookupToDelete(null)}
        onConfirm={executeDeleteLookup}
        title="Delete Item?"
        message="Are you sure you want to delete this item? This action cannot be undone."
      />
    </div >
  );
};

export default AdminDashboard;
