import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'sonner';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth(); // We might need a direct 'setUser' or similar, but login usually does api call. 
    // Actually, useAuth exposes 'user', 'login', 'register', 'logout'.
    // We need to manually update the context state.
    // Since 'login' function in param calls API, we might need to bypass it or add a method to context.
    // However, looking at AuthContext, it syncs with localStorage on mount.
    // So if we set localStorage here and reload or trigger an update, it might work.
    // Better to add a 'socialLogin' method to AuthContext or just manually set localStorage and window.location.reload() for simplicity, 
    // OR better: use the setUser from context if exposed? It is not exposed.
    // Let's check AuthContext again. It has 'setUser' inside but not exposed.

    // I will use a slight hack for now: set localStorage and force a verify or reload.
    // Actually, I can just reload the page to / which will trigger AuthProvider to read from localStorage.

    const processed = useRef(false);

    useEffect(() => {
        if (processed.current) return;
        processed.current = true;

        const token = searchParams.get('token');
        if (!token) {
            toast.error('Login failed: No token received');
            navigate('/login');
            return;
        }

        try {
            const decoded = jwtDecode(token);
            // The payload in backend: { id, username, role, fullName, email }
            // authService expects 'user' in localStorage.

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(decoded));

            toast.success('Login successful!');

            // Redirect based on role
            // We can't access 'user' from context immediately as it needs update.
            // We can resolve the path directly.

            const role = decoded.role;
            let targetPath = '/engineer';
            if (role === 'admin') targetPath = '/admin';
            else if (role === 'project_manager') targetPath = '/project-manager';
            else if (role === 'purchase_manager') targetPath = '/purchase';
            else if (role === 'account_manager') targetPath = '/accounts';

            // We need to update AuthContext state. 
            // Since AuthContext reads from localStorage on mount, we can do a full page reload or
            // dispatch a storage event? 
            // The cleanest way without modifying AuthContext too much is to just window.location.href = targetPath
            // effectively reloading the app.

            window.location.href = targetPath;

        } catch (error) {
            console.error('Token processing error:', error);
            toast.error('Login failed: Invalid token');
            navigate('/login');
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );
};

export default AuthCallback;
