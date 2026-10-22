"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/ui";
import { apiRequest, type User } from "@/lib/api";
import { saveSession } from "@/lib/session";

type Mode = "login" | "register";
type FormValues = { name: string; email: string; password: string; confirmPassword: string };
type FormErrors = Partial<Record<keyof FormValues, string>>;

const blankForm: FormValues = { name: "", email: "", password: "", confirmPassword: "" };
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ mode }: { mode: Mode }) {
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";
  const router = useRouter();

  function update(field: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (isRegister && !form.name.trim()) next.name = "Enter your full name.";
    if (!form.email.trim()) next.email = "Enter your email address.";
    else if (!validEmail.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (!form.password) next.password = "Enter your password.";
    else if (isRegister && form.password.length < 8) next.password = "Use at least 8 characters.";
    if (isRegister && !form.confirmPassword) next.confirmPassword = "Confirm your password.";
    else if (isRegister && form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match.";
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setIsSubmitting(true);
    setError("");
    try {
      const result = await apiRequest<{ user: User; token: string }>(
        `/api/auth/${isRegister ? "register" : "login"}`,
        {
          method: "POST",
          body: isRegister
            ? {
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                confirmPassword: form.confirmPassword,
              }
            : { email: form.email.trim(), password: form.password },
        },
      );
      saveSession(result);
      router.push("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const passwordControl = (
    name: "password" | "confirmPassword",
    label: string,
    visible: boolean,
    toggle: () => void,
  ) => (
    <div className="form-field">
      <label className="form-label" htmlFor={name}>{label}</label>
      <div className="password-wrap">
        <input
          autoComplete={name === "password" ? (isRegister ? "new-password" : "current-password") : "new-password"}
          className="form-control"
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={form[name]}
          onChange={(event) => update(name, event.target.value)}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
        />
        <button className="password-toggle" type="button" onClick={toggle} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {errors[name] && <p className="field-error" id={`${name}-error`}>{errors[name]}</p>}
    </div>
  );

  return (
    <main className="auth-wrap">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand"><Logo /></div>
        <h1 id="auth-title">{isRegister ? "Create your account" : "Welcome back."}</h1>
        <p className="auth-description">
          {isRegister ? "Get a clearer view of your API traffic." : "Sign in to continue to your workspace."}
        </p>
        <form noValidate onSubmit={submit}>
          {isRegister && (
            <div className="form-field">
              <label className="form-label" htmlFor="name">Full name</label>
              <input
                autoComplete="name"
                className="form-control"
                id="name"
                name="name"
                placeholder="Alex Morgan"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && <p className="field-error" id="name-error">{errors.name}</p>}
            </div>
          )}
          <div className="form-field">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              autoComplete="email"
              className="form-control"
              id="email"
              name="email"
              placeholder="you@example.com"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && <p className="field-error" id="email-error">{errors.email}</p>}
          </div>
          {passwordControl("password", "Password", showPassword, () => setShowPassword(!showPassword))}
          {isRegister && passwordControl("confirmPassword", "Confirm password", showConfirm, () => setShowConfirm(!showConfirm))}
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait…" : isRegister ? "Create account" : "Log in"}
          </button>
        </form>
        <p className="auth-foot">
          {isRegister ? "Already have an account?" : "New to TrafficFlow?"}{" "}
          <Link className="text-link" href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>
        <Link className="auth-back" href="/">← Back to home</Link>
      </section>
    </main>
  );
}
