import { motion } from "framer-motion";
import { LogIn, ArrowRight, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import { useAuth } from "@/context/AuthContext";

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleDashboardRedirect = () => {
    if (!user) return;

    switch (user.role) {
      case 'admin':
        navigate('/admin');
        break;
      case 'project_manager':
        navigate('/project-manager');
        break;
      case 'purchase_manager':
        navigate('/purchase');
        break;
      case 'account_manager':
        navigate('/accounts');
        break;
      case 'engineer':
      default:
        navigate('/engineer');
        break;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans">
      <BackgroundOrbs />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="p-6 md:p-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/10 rounded-xl p-2 backdrop-blur-md border border-white/20">
              <img src="/arihantlogo.png" alt="Arihant Group" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground hidden sm:block">
              Arihant Dream Infra <span className="text-gradient-primary">Projects Limited</span>
            </h1>
          </div>

          {!isAuthenticated && (
            <motion.button
              onClick={() => navigate("/login")}
              className="glass-card px-6 py-2.5 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </motion.button>
          )}
        </motion.header>

        {/* Main Content - Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium text-muted-foreground mb-4"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Operational & Live
            </motion.div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Building <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Dreams</span>,<br />
              Delivering <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">Excellence.</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Advanced portal for streamlined labour deployment, real-time tracking, and project management.
            </p>

            {/* CTA Buttons */}
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
              {isAuthenticated ? (
                <motion.button
                  onClick={handleDashboardRedirect}
                  className="group relative px-8 py-4 bg-primary text-primary-foreground text-lg font-bold rounded-2xl overflow-hidden shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <div className="relative flex items-center gap-3">
                    <LayoutDashboard className="w-6 h-6" />
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => navigate("/login")}
                  className="group relative px-8 py-4 bg-white text-black text-lg font-bold rounded-2xl overflow-hidden shadow-2xl hover:shadow-white/20 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="relative flex items-center gap-3">
                    <span>Login to Portal</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              )}
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="p-8 text-center"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
            <p className="text-muted-foreground text-sm font-medium tracking-wide">
              COPYRIGHT © 2026 ARIHANT DREAM INFRA PROJECT LIMITED. ALL RIGHTS RESERVED.
            </p>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default Landing;
