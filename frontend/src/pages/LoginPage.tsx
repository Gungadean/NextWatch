import AuthLayout from "../layouts/AuthLayout.tsx";
import {LoginForm} from "../features/authentication/components/LoginForm.tsx";

const LoginPage = () => {
  return (
    <AuthLayout title="Sign in to your account">
      <LoginForm />
    </AuthLayout>
  );
}

export default LoginPage;