import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const ProjectManagerRoute = ({ children }) => {
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

    // Allow admins to access PM routes as well, or strictly PMs?
    // Usually admins have higher privileges. I'll allow admins too.
    if (user?.role !== 'project_manager' && user?.role !== 'admin') {
        return <Navigate to="/engineer" replace />;
    }

    return children;
};

export default ProjectManagerRoute;
