import AuthLayout from "../layouts/AuthLayout.tsx";
import {RegisterForm} from "../features/authentication/components/RegisterForm.tsx";

const RegisterPage = () => {
  return (
    <AuthLayout title="Register for a new account">
      <RegisterForm />
    </AuthLayout>
  );
}

export default RegisterPage;