import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, User, Shield, Check, X, Archive, Ban, Mail, Phone, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { userService } from "@/services/userService";
import { toast } from "sonner";

const UserManagement = () => {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        password: "",
        role: "engineer",
        status: "active",
        fullName: "",
        email: "",
        phone: "",
        employeeId: "",
        otp: ""
    });

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: userService.getAllUsers
    });

    const sendOtpMutation = useMutation({
        mutationFn: userService.sendRegistrationOtp,
        onSuccess: () => {
            toast.success("Verification OTP sent to the user's email.");
            setCurrentStep(2);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to send OTP");
        }
    });

    const createUserMutation = useMutation({
        mutationFn: userService.createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("User created successfully");
            handleCloseDialog();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to create user");
        }
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ id, data }) => userService.updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("User updated successfully");
            handleCloseDialog();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to update user");
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: userService.deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("User deleted successfully");
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to delete user");
        }
    });

    const handleOpenDialog = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                password: "", // Don't show password
                role: user.role,
                status: user.status || "active",
                fullName: user.fullName || "",
                email: user.email || "",
                phone: user.phone || "",
                employeeId: user.employeeId || "",
                otp: ""
            });
            setCurrentStep(1);
        } else {
            setEditingUser(null);
            setFormData({
                password: "",
                role: "engineer",
                status: "active",
                fullName: "",
                email: "",
                phone: "",
                employeeId: "",
                otp: ""
            });
            setCurrentStep(1);
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingUser(null);
        setCurrentStep(1);
        setFormData({
            password: "",
            role: "engineer",
            status: "active",
            fullName: "",
            email: "",
            phone: "",
            employeeId: "",
            otp: ""
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingUser) {
            updateUserMutation.mutate({
                id: editingUser._id,
                data: formData
            });
            return;
        }

        // New User Flow
        if (currentStep === 1) {
            if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
                toast.error("Please fill in all required fields including password");
                return;
            }
            sendOtpMutation.mutate(formData.email);
        } else if (currentStep === 2) {
            if (!formData.otp) {
                toast.error("Please enter the verification OTP");
                return;
            }
            createUserMutation.mutate({ ...formData, username: formData.email });
        }
    };

    const [userToDelete, setUserToDelete] = useState(null);

    // ... (existing code)

    const handleDelete = (user) => {
        setUserToDelete(user);
    };

    const confirmDelete = () => {
        if (userToDelete) {
            deleteUserMutation.mutate(userToDelete._id);
            setUserToDelete(null);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-foreground">User Management</h3>
                    <p className="text-muted-foreground text-sm">Manage system users, roles, and access status</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input type="text" placeholder="Search name, email, role…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-full" />
                    </div>
                    <Button onClick={() => handleOpenDialog()} className="gap-2 whitespace-nowrap">
                        <Plus className="w-4 h-4" />
                        Add User
                    </Button>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                            <TableRow>
                                <TableHead className="p-4 whitespace-nowrap">Full Name</TableHead>
                                <TableHead className="p-4 whitespace-nowrap">Contact Info</TableHead>
                                <TableHead className="p-4 whitespace-nowrap">Role</TableHead>
                                <TableHead className="p-4 whitespace-nowrap">Status</TableHead>
                                <TableHead className="p-4 whitespace-nowrap text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-white/10">
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Loading users...</TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No users found.</TableCell>
                                </TableRow>
                            ) : (
                                (() => {
                                    const q = searchQuery.toLowerCase();
                                    const filtered = users.filter(user =>
                                        !q ||
                                        user.fullName?.toLowerCase().includes(q) ||
                                        user.email?.toLowerCase().includes(q) ||
                                        user.role?.toLowerCase().includes(q)
                                    );

                                    if (filtered.length === 0) {
                                        return (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No users match your search.</TableCell>
                                            </TableRow>
                                        );
                                    }

                                    return filtered.map((user) => (
                                        <TableRow key={user._id}>
                                            <TableCell className="font-medium p-4">{user.fullName}</TableCell>
                                            <TableCell className="p-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Mail className="w-3 h-3" />
                                                        {user.email || "-"}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Phone className="w-3 h-3" />
                                                        {user.phone || "-"}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium border ${user.role === 'admin'
                                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                    : user.role === 'project_manager'
                                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                        : user.role === 'purchase_manager'
                                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                            : user.role === 'account_manager'
                                                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                                                : 'bg-green-500/10 text-green-400 border-green-500/20'
                                                    }`}>
                                                    {user.role === 'project_manager' ? 'Project Manager' :
                                                        user.role === 'purchase_manager' ? 'Purchase Manager' :
                                                            user.role === 'account_manager' ? 'Account Manager' :
                                                                user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center w-fit gap-1 ${user.status === 'active' || !user.status
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : user.status === 'suspended'
                                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        : user.status === 'pending'
                                                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                    {user.status === 'active' || !user.status ? <Check className="w-3 h-3" /> : user.status === 'suspended' ? <Ban className="w-3 h-3" /> : user.status === 'pending' ? <Shield className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                    {(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenDialog(user)}
                                                        className="p-1.5 hover:bg-white/20 rounded-lg text-blue-400 transition-colors"
                                                        title="Edit User"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="p-1.5 hover:bg-white/20 rounded-lg text-red-400 transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                })()
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <Input
                                    placeholder="Enter full name"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    type="email"
                                    placeholder="Enter email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone</label>
                                <Input
                                    type="tel"
                                    placeholder="Enter phone number"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Employee ID (Optional)</label>
                                <Input
                                    placeholder="Enter Employee ID"
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {editingUser ? "New Password" : "Password"}
                                </label>
                                <Input
                                    type="password"
                                    placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="engineer">Engineer</SelectItem>
                                        <SelectItem value="project_manager">Project Manager</SelectItem>
                                        <SelectItem value="purchase_manager">Purchase Manager</SelectItem>
                                        <SelectItem value="account_manager">Account Manager</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="pending">Pending Approval</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                        <SelectItem value="deactivated">Deactivated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {currentStep === 2 && !editingUser && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-white/10 space-y-4">
                                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> Email Verification Required
                                    </h4>
                                    <p className="text-sm text-primary/80 mb-4">
                                        An OTP has been sent to <strong>{formData.email}</strong>. Please enter the OTP to verify the email and create the user.
                                    </p>
                                    <div className="space-y-4 flex flex-col items-center">
                                        <InputOTP
                                            maxLength={6}
                                            pattern={REGEXP_ONLY_DIGITS}
                                            value={formData.otp}
                                            onChange={(value) => setFormData({ ...formData, otp: value })}
                                        >
                                            <InputOTPGroup>
                                                <InputOTPSlot index={0} className="w-12 h-14 text-lg" />
                                                <InputOTPSlot index={1} className="w-12 h-14 text-lg" />
                                                <InputOTPSlot index={2} className="w-12 h-14 text-lg" />
                                            </InputOTPGroup>
                                            <InputOTPSeparator />
                                            <InputOTPGroup>
                                                <InputOTPSlot index={3} className="w-12 h-14 text-lg" />
                                                <InputOTPSlot index={4} className="w-12 h-14 text-lg" />
                                                <InputOTPSlot index={5} className="w-12 h-14 text-lg" />
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <DialogFooter>
                            {currentStep === 1 ? (
                                <>
                                    <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                                    <Button type="submit" disabled={sendOtpMutation.isPending || updateUserMutation.isPending}>
                                        {editingUser ? "Update User" : (sendOtpMutation.isPending ? "Sending OTP..." : "Send Verification OTP")}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                                    <Button type="submit" disabled={createUserMutation.isPending}>
                                        {createUserMutation.isPending ? "Verifying..." : "Verify & Create User"}
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user
                            <span className="font-semibold text-foreground"> {userToDelete?.email} </span>
                            and remove their data from the servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div >
    );
};

export default UserManagement;
