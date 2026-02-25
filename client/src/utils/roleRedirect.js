/**
 * Returns the home route for a given user role.
 * Used by route guards to redirect unauthorised users to their own dashboard.
 */
export const getHomeRoute = (role) => {
    switch (role) {
        case 'admin': return '/admin';
        case 'engineer': return '/engineer';
        case 'project_manager': return '/project-manager';
        case 'purchase_manager': return '/purchase';
        case 'account_manager': return '/accounts';
        default: return '/login';
    }
};
