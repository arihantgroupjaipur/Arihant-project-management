import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getHomeRoute } from "@/utils/roleRedirect";

const Spinner = () => (
    <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
);

/** Only 'account_manager' role allowed */
const AccountManagerRoute = ({ children }) => {
    const { user, isAuthenticated, loading } = useAuth();
    if (loading) return <Spinner />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.role !== 'account_manager') {
        return <Navigate to={getHomeRoute(user?.role)} replace />;
    }
    return children;
};

export default AccountManagerRoute;
