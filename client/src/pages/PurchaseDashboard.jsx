import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, ShoppingCart, FileText, TrendingUp, AlertCircle } from "lucide-react";
import BackgroundOrbs from "@/components/BackgroundOrbs";

const PurchaseDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
            <BackgroundOrbs />

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <header className="px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-xl border border-white/20">
                                <img src="/arihantlogo.png" alt="Logo" className="w-8 h-8 object-contain" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                                    Purchase Department
                                </h1>
                                <p className="text-xs text-muted-foreground">Arihant Dream Infra Projects Limited</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden md:block text-right">
                                <p className="text-sm font-medium">{user?.fullName}</p>
                                <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground hover:text-red-400"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* Welcome Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card p-8 relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold mb-2">
                                    Welcome back, <span className="text-gradient-primary">{user?.fullName}</span>
                                </h2>
                                <p className="text-muted-foreground">
                                    Manage purchase orders, inventory, and vendor relationships.
                                </p>
                            </div>
                            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                        </motion.div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { title: "Pending Orders", value: "0", icon: ShoppingCart, color: "text-blue-400" },
                                { title: "Approvals Needed", value: "0", icon: AlertCircle, color: "text-amber-400" },
                                { title: "Total Expenses", value: "₹0", icon: TrendingUp, color: "text-emerald-400" },
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

                        {/* Recent Activity / Placeholder */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="glass-card p-8 text-center py-20"
                        >
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No Purchase Orders Found</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Purchase tracking features will appear here. You can start managing orders once data is available.
                            </p>
                        </motion.div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PurchaseDashboard;
