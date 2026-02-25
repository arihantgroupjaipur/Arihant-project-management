import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Spinner = () => (
    <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
);

/** Only 'admin' role allowed */
const AdminRoute = ({ children }) => {
    const { user, isAuthenticated, loading } = useAuth();
    if (loading) return <Spinner />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.role !== 'admin') {
        // Redirect the intruder to their own dashboard
        const homeMap = {
            engineer: '/engineer',
            project_manager: '/project-manager',
            purchase_manager: '/purchase',
            account_manager: '/accounts',
        };
        return <Navigate to={homeMap[user?.role] || '/login'} replace />;
    }
    return children;
};

export default AdminRoute;
