import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, User, Lock, ArrowLeft, Mail, Phone, IdCard, FileText, Github } from "lucide-react";
import { toast } from "sonner";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import FloatingInput from "@/components/FloatingInput";
import { useAuth } from "@/context/AuthContext";

const Signup = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
        role: "engineer",
        fullName: "",
        email: "",
        phone: "",
        employeeId: ""
    });

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.password || !formData.confirmPassword || !formData.fullName || !formData.email || !formData.phone) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);
        try {
            await register(
                formData.email, // using email as username
                formData.password,
                formData.role,
                formData.fullName,
                formData.phone,
                formData.employeeId
            );
            toast.success("Account created! Please verify your email.");
            navigate("/verify-email", { state: { email: formData.email } });
        } catch (error) {
            console.error("Signup error:", error);
            toast.error(error.response?.data?.message || "Failed to create account");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen relative overflow-hidden flex flex-col">
                <BackgroundOrbs />
                {/* Header */}
                <div className="relative z-10 p-6 flex items-center justify-between w-full">
                    <motion.div
                        onClick={() => navigate("/")}
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <div className="bg-white/10 rounded-xl p-2 backdrop-blur-md border border-white/20">
                            <img src="/arihantlogo.png" alt="Arihant Logo" className="w-8 h-8 object-contain" />
                        </div>
                        <span className="font-bold text-base md:text-lg text-foreground">Arihant Dream Infra Projects Limited</span>
                    </motion.div>
                </div>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 md:p-6 pb-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-8 md:p-12 w-full max-w-lg text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Registration Successful!</h2>
                        <p className="text-muted-foreground text-lg mb-8">
                            Your account is currently <span className="text-amber-400 font-semibold">Pending Approval</span>.
                            <br /><br />
                            Please wait for the administrator to verify your details. You will be able to login once your account is activated.
                        </p>
                        <motion.button
                            onClick={() => navigate("/login")}
                            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Go to Login
                        </motion.button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col">
            <BackgroundOrbs />

            {/* Header */}
            <div className="relative z-10 p-6 flex items-center justify-between w-full">
                <motion.div
                    onClick={() => navigate("/")}
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="bg-white/10 rounded-xl p-2 backdrop-blur-md border border-white/20">
                        <img src="/arihantlogo.png" alt="Arihant Logo" className="w-8 h-8 object-contain" />
                    </div>
                    <span className="font-bold text-base md:text-lg text-foreground">Arihant Dream Infra Projects Limited</span>
                </motion.div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 md:p-6 pb-8">
                {/* Signup Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 md:p-12 w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
                >
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center mx-auto mb-4"
                        >
                            <UserPlus className="w-8 h-8 text-secondary" />
                        </motion.div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            Create <span className="text-gradient-secondary">Account</span>
                        </h1>
                        <p className="text-muted-foreground">Join Arihant Dream Infra Projects Limited today</p>
                    </div>



                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                        <div className="grid md:grid-cols-2 gap-6">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.35 }}
                            >
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                                    <FloatingInput
                                        type="text"
                                        label="Full Name"
                                        value={formData.fullName}
                                        onChange={(e) => handleInputChange("fullName", e.target.value)}
                                        className="pl-11"
                                        labelClassName="peer-focus:left-11 peer-[:not(:placeholder-shown)]:left-0 left-11"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                                    <FloatingInput
                                        type="email"
                                        label="Email Address"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange("email", e.target.value)}
                                        className="pl-11"
                                        labelClassName="peer-focus:left-11 peer-[:not(:placeholder-shown)]:left-0 left-11"
                                    />
                                </div>
                            </motion.div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.45 }}
                            >
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                                    <FloatingInput
                                        type="tel"
                                        label="Phone Number"
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange("phone", e.target.value)}
                                        className="pl-11"
                                        labelClassName="left-11"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <div className="relative">
                                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                                    <FloatingInput
                                        type="text"
                                        label="Employee ID (Optional)"
                                        value={formData.employeeId}
                                        onChange={(e) => handleInputChange("employeeId", e.target.value)}
                                        className="pl-11"
                                        labelClassName="left-11"
                                    />
                                </div>
                            </motion.div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.55 }}
                            >
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                                    <FloatingInput
                                        type="password"
                                        label="Password"
                                        value={formData.password}
                                        onChange={(e) => handleInputChange("password", e.target.value)}
                                        className="pl-11"
                                        labelClassName="left-11"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                                    <FloatingInput
                                        type="password"
                                        label="Confirm Password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                                        className="pl-11"
                                        labelClassName="left-11"
                                    />
                                </div>
                            </motion.div>
                        </div>

                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl font-semibold text-lg bg-secondary text-secondary-foreground hover:brightness-110 transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                            whileHover={!isLoading ? { scale: 1.02 } : {}}
                            whileTap={!isLoading ? { scale: 0.98 } : {}}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.65 }}
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Create Account
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Login Link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="mt-6 text-center"
                    >
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>

                        {/* Social Login */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button
                                type="button"
                                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/google`}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-all"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Google
                            </button>
                            <button
                                type="button"
                                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/github`}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-all"
                            >
                                <Github className="w-5 h-5" />
                                GitHub
                            </button>
                        </div>

                        <p className="text-muted-foreground">
                            Already have an account?{" "}
                            <Link
                                to="/login"
                                className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
                            >
                                Sign In
                            </Link>
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default Signup;
