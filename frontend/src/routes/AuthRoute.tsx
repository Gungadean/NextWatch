import { Navigate, Outlet, useLocation } from 'react-router';
import {useAuth} from "../context/useAuth.ts";

const AuthRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div>Loading...</div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default AuthRoute;