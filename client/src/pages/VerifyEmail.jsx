import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import FloatingInput from "@/components/FloatingInput";
import { authService } from "@/services/authService";

const VerifyEmail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (location.state?.email) {
            setEmail(location.state.email);
        }
    }, [location]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!email || !otp) {
            toast.error("Please enter email and OTP");
            return;
        }

        setIsLoading(true);
        try {
            await authService.verifyEmail(email, otp);
            toast.success("Email verified successfully!");
            navigate("/login");
        } catch (error) {
            console.error("Verification error:", error);
            toast.error(error.response?.data?.message || "Verification failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col">
            <BackgroundOrbs />

            {/* Header */}
            <div className="relative z-10 p-6 flex items-center justify-between w-full">
                <motion.div
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Login</span>
                </motion.div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 md:p-12 w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
                        <p className="text-muted-foreground">
                            Enter the OTP sent to {email || "your email"}
                        </p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-6">
                        {!location.state?.email && (
                            <FloatingInput
                                type="email"
                                label="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        )}

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

                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isLoading ? "Verifying..." : "Verify Email"}
                        </motion.button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default VerifyEmail;
