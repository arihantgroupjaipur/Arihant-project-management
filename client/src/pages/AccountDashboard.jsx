import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, DollarSign, PieChart, FileText, Wallet, LayoutDashboard, Receipt } from "lucide-react";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import BillsList from "@/components/BillsList";
import PaymentVouchersList from "@/components/PaymentVouchersList";

const AccountDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const menuItems = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "bills", label: "Bills", icon: Receipt },
        { id: "payment-vouchers", label: "Payment Vouchers", icon: Wallet },
    ];

    return (
        <div className="h-screen overflow-hidden relative flex bg-background text-foreground">
            <BackgroundOrbs />

            {/* Sidebar */}
            <aside className="relative z-20 w-64 border-r border-white/10 bg-black/20 backdrop-blur-xl flex-col hidden md:flex">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-foreground">
                        Accounts <span className="text-gradient-secondary">Dept.</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">Financial Management</p>
                </div>
                <nav className="flex-1 px-4 space-y-2 py-4">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                                    ? "bg-secondary/20 text-secondary border border-secondary/20"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 border-b border-white/10 bg-black/10 backdrop-blur-md flex items-center justify-between px-4 md:px-8 shrink-0">
                    <h2 className="text-lg font-semibold text-foreground">
                        {menuItems.find(item => item.id === activeTab)?.label}
                    </h2>
                    <div className="text-sm text-muted-foreground hidden md:block">
                        Welcome, {user?.fullName}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="max-w-6xl mx-auto"
                    >
                        {activeTab === "overview" && (
                            <div className="space-y-8">
                                {/* Welcome Section */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card p-8 relative overflow-hidden"
                                >
                                    <div className="relative z-10">
                                        <h2 className="text-3xl font-bold mb-2">
                                            Welcome back, <span className="text-gradient-secondary">{user?.fullName}</span>
                                        </h2>
                                        <p className="text-muted-foreground">
                                            Monitor cash flow, track expenses, and manage financial reports.
                                        </p>
                                    </div>
                                    <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-secondary/10 to-transparent pointer-events-none" />
                                </motion.div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { title: "Total Revenue", value: "₹0", icon: Wallet, color: "text-emerald-400" },
                                        { title: "Outstanding", value: "₹0", icon: DollarSign, color: "text-red-400" },
                                        { title: "Net Profit", value: "₹0", icon: PieChart, color: "text-blue-400" },
                                    ].map((stat, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 + 0.2 }}
                                            className="glass-card p-6 flex items-start justify-between"
                                        >
                                            <div>
                                                <p className="text-muted-foreground text-sm font-medium mb-1">{stat.title}</p>
                                                <h3 className="text-2xl font-bold">{stat.value}</h3>
                                            </div>
                                            <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                                                <stat.icon className="w-6 h-6" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Placeholder */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="glass-card p-8 text-center py-20"
                                >
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">No Transactions Found</h3>
                                    <p className="text-muted-foreground max-w-md mx-auto">
                                        Financial records and transaction history will be displayed here.
                                    </p>
                                </motion.div>
                            </div>
                        )}

                        {activeTab === "bills" && <BillsList />}
                        {activeTab === "payment-vouchers" && <PaymentVouchersList />}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default AccountDashboard;
