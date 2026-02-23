import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { KeyRound, ArrowLeft, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import FloatingInput from "@/components/FloatingInput";
import { authService } from "@/services/authService";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Request OTP, 2: Reset Password
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email");
            return;
        }

        setIsLoading(true);
        try {
            await authService.forgotPassword(email);
            toast.success("OTP sent to your email");
            setStep(2);
        } catch (error) {
            console.error("Error requesting OTP:", error);
            toast.error(error.response?.data?.message || "Failed to send OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!otp || !newPassword) {
            toast.error("Please enter OTP and new password");
            return;
        }

        setIsLoading(true);
        try {
            await authService.resetPassword(email, otp, newPassword);
            toast.success("Password reset successful!");
            navigate("/login");
        } catch (error) {
            console.error("Error resetting password:", error);
            toast.error(error.response?.data?.message || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col">
            <BackgroundOrbs />

            <div className="relative z-10 p-6">
                <motion.div
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity text-white w-fit"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Login</span>
                </motion.div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 md:p-12 w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">
                            {step === 1 ? "Forgot Password" : "Reset Password"}
                        </h1>
                        <p className="text-muted-foreground">
                            {step === 1
                                ? "Enter your email to receive a reset OTP"
                                : "Enter the OTP sent to your email"}
                        </p>
                    </div>

                    {step === 1 ? (
                        <form onSubmit={handleRequestOtp} className="space-y-6">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                                <FloatingInput
                                    type="email"
                                    label="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-11"
                                    labelClassName="left-11"
                                />
                            </div>

                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-70"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {isLoading ? "Sending..." : "Send OTP"}
                            </motion.button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                                <FloatingInput
                                    type="email"
                                    label="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-11"
                                    labelClassName="left-11"
                                    disabled
                                />
                            </div>

                            <div className="flex justify-center gap-2 mb-6">
                                {[...Array(6)].map((_, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        maxLength={1}
                                        value={otp[index] || ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (!/^\d*$/.test(value)) return;

                                            const newOtp = otp.split("");
                                            newOtp[index] = value;
                                            const newOtpStr = newOtp.join("");
                                            setOtp(newOtpStr);

                                            if (value && index < 5) {
                                                document.getElementById(`otp-${index + 1}`).focus();
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Backspace" && !otp[index] && index > 0) {
                                                document.getElementById(`otp-${index - 1}`).focus();
                                            }
                                        }}
                                        className="w-12 h-14 text-center text-2xl font-bold bg-background border border-input rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                ))}
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                                <FloatingInput
                                    type="password"
                                    label="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="pl-11"
                                    labelClassName="left-11"
                                />
                            </div>

                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-70"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {isLoading ? "Resetting..." : "Reset Password"}
                            </motion.button>
                        </form>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default ForgotPassword;
