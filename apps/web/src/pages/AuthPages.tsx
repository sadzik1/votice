import { loginInputSchema, registerInputSchema } from "@survey/shared";
import { type FormEvent, type ReactNode, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useLogin, useRegister } from "../api/auth.ts";
import { ApiRequestError } from "../api/client.ts";
import {
  Alert,
  Button,
  Card,
  cx,
  errorProps,
  Field,
  inputClass,
  invalidInputClass,
} from "../components/ui.tsx";
import {
  apiFieldErrors,
  errorMessage,
  type FieldErrors,
  issuesToFieldErrors,
  safeNextPath,
} from "../lib/errors.ts";

function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-center text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 mb-6 text-center text-sm text-ink-muted">{subtitle}</p>
      <Card className="p-6">{children}</Card>
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  type?: string;
  autoComplete: string;
  value: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
};

function TextField({
  id,
  label,
  type = "text",
  autoComplete,
  value,
  error,
  hint,
  onChange,
}: TextFieldProps) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(inputClass, error && invalidInputClass)}
        {...errorProps(id, error)}
      />
    </Field>
  );
}

function formError(error: unknown, fields: FieldErrors): string | null {
  if (!error || Object.keys(fields).length > 0) return null;
  if (error instanceof ApiRequestError && error.status === 429) return error.message;
  return errorMessage(error);
}

export function LoginPage() {
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const login = useLogin();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = loginInputSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    login.mutate(parsed.data, {
      onSuccess: () => navigate(safeNextPath(params.get("next")), { replace: true }),
      onError: (error) => setErrors(apiFieldErrors(error)),
    });
  }

  const message = formError(login.error, errors);

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          No account yet?{" "}
          <Link to="/register" className="font-medium text-accent-ink hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {message && <Alert tone="error">{message}</Alert>}
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={(email) => setValues((v) => ({ ...v, email }))}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={(password) => setValues((v) => ({ ...v, password }))}
        />
        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const register = useRegister();
  const navigate = useNavigate();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = registerInputSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    register.mutate(parsed.data, {
      onSuccess: () => navigate("/surveys", { replace: true }),
      onError: (error) => {
        if (error instanceof ApiRequestError && error.status === 409) {
          setErrors({ email: error.message });
        } else {
          setErrors(apiFieldErrors(error));
        }
      },
    });
  }

  const message = formError(register.error, errors);

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have one?{" "}
          <Link to="/login" className="font-medium text-accent-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {message && <Alert tone="error">{message}</Alert>}
        <TextField
          id="name"
          label="Name"
          autoComplete="name"
          value={values.name}
          error={errors.name}
          onChange={(name) => setValues((v) => ({ ...v, name }))}
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={(email) => setValues((v) => ({ ...v, email }))}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          value={values.password}
          error={errors.password}
          onChange={(password) => setValues((v) => ({ ...v, password }))}
        />
        <Button type="submit" className="w-full" loading={register.isPending}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
