import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Loader2, Sparkle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

const SearchSchema = z.object({
  redirect: z.string().optional(),
});

const emailSchema = z.string().trim().email({ message: "Enter a valid email address" }).max(255);

const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
});

const RESEND_SECONDS = 45;

export const Route = createFileRoute("/auth")({
  validateSearch: SearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Retrieva AI" },
      { name: "description", content: "Sign in to ask grounded questions against your Retrieva knowledge base." },
      { property: "og:title", content: "Sign in — Retrieva AI" },
      { property: "og:description", content: "Access the grounded AI support assistant for your knowledge base." },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

type Step = "credentials" | "signup-otp" | "forgot-email" | "recovery-otp" | "new-password";

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const { isAuthenticated, loading } = useAuth();
  const destination = safePath(search.redirect);
  const go = () => {
    if (destination.includes("?")) window.location.assign(destination);
    else navigate({ to: destination, replace: true });
  };

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [recoveryVerified, setRecoveryVerified] = useState(false);
  const otpWrapRef = useRef<HTMLDivElement | null>(null);

  const isOtpStep = step === "signup-otp" || step === "recovery-otp";

  useEffect(() => {
    if (!loading && isAuthenticated && !recoveryVerified) {
      go();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, destination, recoveryVerified]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  // Auto-focus the first OTP slot whenever the code step opens.
  useEffect(() => {
    if (!isOtpStep) return;
    const input = otpWrapRef.current?.querySelector("input");
    input?.focus();
  }, [isOtpStep]);

  const startOtpStep = useCallback((next: Step) => {
    setOtp("");
    setOtpError(null);
    setCooldown(RESEND_SECONDS);
    setStep(next);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: { full_name: fullName.trim().slice(0, 80) || undefined },
          },
        });
        if (error) throw error;
        if (!data.session) {
          startOtpStep("signup-otp");
          toast.success("We sent a 6-digit code to your email");
          return;
        }
        toast.success("Welcome to Retrieva AI");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message.includes("Invalid login") ? "Incorrect email or password" : message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}${destination}`,
      });

      if (result.error) {
        toast.error("Google sign-in failed. Please try again.");
        return;
      }
      if (result.redirected) return;
      go();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotRequest(event: React.FormEvent) {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      startOtpStep("recovery-otp");
      toast.success("We sent a 6-digit reset code to your email");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reset code");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    if (otp.length !== 6) {
      setOtpError("Enter all 6 digits of the code");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setOtpError("The code contains only numbers");
      return;
    }
    setSubmitting(true);
    setOtpError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: step === "signup-otp" ? "signup" : "recovery",
      });
      if (error) throw error;
      if (step === "recovery-otp") {
        setRecoveryVerified(true);
        setStep("new-password");
        toast.success("Code verified — choose a new password");
      } else {
        toast.success("Account verified — welcome to Retrieva AI");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed";
      setOtpError(
        /expired/i.test(message)
          ? "That code expired. Send a new one."
          : /invalid|token/i.test(message)
            ? "That code isn't correct. Check your email and try again."
            : message,
      );
      setOtp("");
      otpWrapRef.current?.querySelector("input")?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (cooldown > 0) return;
    setResending(true);
    try {
      if (step === "recovery-otp") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
        if (error) throw error;
      }
      setOtp("");
      setOtpError(null);
      setCooldown(RESEND_SECONDS);
      toast.success("New code sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend the code");
    } finally {
      setResending(false);
    }
  }

  async function handleNewPassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated — you're signed in");
      setRecoveryVerified(false);
      setStep("credentials");
      go();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the password");
    } finally {
      setSubmitting(false);
    }
  }

  if (isOtpStep) {
    const isRecovery = step === "recovery-otp";
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold tracking-tight">Enter your code</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We sent a 6-digit {isRecovery ? "password reset" : "verification"} code to{" "}
          <span className="font-medium text-foreground">{email}</span>.{" "}
          {isRecovery ? "Enter it to choose a new password." : "Enter it below to finish creating your account."}
        </p>
        <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
          <div className="flex justify-center" ref={otpWrapRef}>
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => {
                setOtp(value);
                if (otpError) setOtpError(null);
              }}
              aria-label="Verification code"
              aria-invalid={otpError ? true : undefined}
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            You can paste the whole code from your email.
          </p>
          {otpError && (
            <p role="alert" className="text-center text-sm text-destructive">
              {otpError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting || otp.length !== 6}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Verify and continue
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resending || cooldown > 0}
            className="text-brand transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? "Sending…" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOtp("");
              setOtpError(null);
              setStep(isRecovery ? "forgot-email" : "credentials");
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Use a different email
          </button>
        </div>
      </Shell>
    );
  }

  if (step === "forgot-email") {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your account email and we'll send a 6-digit code to reset your password.
        </p>
        <form onSubmit={handleForgotRequest} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Work email</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              maxLength={255}
              autoComplete="email"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Send reset code
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setStep("credentials")}
          className="mt-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to sign in
        </button>
      </Shell>
    );
  }

  if (step === "new-password") {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your code was verified. Set a new password for{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
        <form onSubmit={handleNewPassword} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold tracking-tight">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Sign in to ask grounded questions against your knowledge base."
          : "Start querying your documents with cited, retrieval-backed answers."}
      </p>

      <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)} className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>

        <TabsContent value={mode} className="mt-6">
          <Button variant="outline" className="w-full gap-2" onClick={handleGoogle} disabled={submitting}>
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or use email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  maxLength={80}
                  autoComplete="name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                maxLength={255}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => setStep("forgot-email")}
                    className="text-xs text-brand transition-opacity hover:opacity-80"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                maxLength={72}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(45% 60% at 50% 0%, color-mix(in oklab, var(--brand) 25%, transparent), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
        <div className="surface-panel p-8">
          <span className="gradient-brand mb-6 flex size-10 items-center justify-center rounded-xl text-brand-foreground">
            <Sparkle className="size-5" />
          </span>
          {children}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.56Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.75H1.7v2.98A11.99 11.99 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.55 14.67a7.2 7.2 0 0 1 0-4.6V7.09H1.7a12 12 0 0 0 0 10.56l3.85-2.98Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.2 15.1 0 12 0 7.4 0 3.42 2.64 1.7 6.49l3.85 2.98C6.46 6.77 9 4.75 12 4.75Z"
      />
    </svg>
  );
}
