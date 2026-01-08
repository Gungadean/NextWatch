import React, {useEffect, useState} from 'react';
import {type AuthRequest, loginUser, logoutUser, verifyAccessToken} from '../features/authentication/authApi';
import { AuthContext } from "./useAuth";

export interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
    login: (data: AuthRequest) => Promise<void>;
    logout: () => void;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Attempt to verify access token.
                await verifyAccessToken();
                setIsAuthenticated(true);
            } catch {
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = async (data: AuthRequest) => {
      await loginUser(data);

      setIsAuthenticated(true);
    }

    const logout = async () => {
      try {
        await logoutUser()
      } finally {
        setIsAuthenticated(false);
      }
    }

    const contextValue = React.useMemo(
        () => ({
            isAuthenticated: isAuthenticated,
            isLoading: isLoading,
            setIsAuthenticated,
            login,
            logout
        }),
        [isAuthenticated, isLoading]
    )

  return (
        <AuthContext.Provider value={contextValue}>
          {!isLoading && children}
        </AuthContext.Provider>
    );
};