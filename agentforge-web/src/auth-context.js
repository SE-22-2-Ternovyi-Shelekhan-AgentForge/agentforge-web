import { createContext, useContext } from 'react';

// Auth context + hook live here (JSX-free) so auth.jsx can export only the
// AuthProvider component and keep React Fast Refresh happy.
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}
