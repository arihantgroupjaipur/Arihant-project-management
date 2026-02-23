import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowLeft } from "lucide-react";
import BackgroundOrbs from "@/components/BackgroundOrbs";

const PendingApproval = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col">
            <BackgroundOrbs />

            {/* Header */}
            <div className="relative z-10 p-6 flex items-center justify-between w-full">
                <motion.div
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Home</span>
                </motion.div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 md:p-12 w-full max-w-md text-center"
                >
                    <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-yellow-500" />
                    </div>

                    <h1 className="text-2xl font-bold mb-4">Account Pending Approval</h1>

                    <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                        Your account has been created and verified, but it is currently pending administrator approval.
                    </p>

                    <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 mb-8">
                        <p className="text-sm text-foreground">
                            You will be notified via email once your account has been approved by the admin team.
                        </p>
                    </div>

                    <motion.button
                        onClick={() => navigate("/login")}
                        className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Back to Login
                    </motion.button>
                </motion.div>
            </div>
        </div>
    );
};

export default PendingApproval;
