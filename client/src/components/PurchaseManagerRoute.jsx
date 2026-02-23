import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PurchaseManagerRoute = ({ children }) => {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'purchase_manager' && user?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PurchaseManagerRoute;
