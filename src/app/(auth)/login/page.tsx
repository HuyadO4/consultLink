"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/Input/Input";
import { createClient } from "@/lib/supabase/client";
import {
  SUPABASE_CONNECTIVITY_MESSAGE,
  isSupabaseConnectivityError,
} from "@/lib/supabase/errors";
import styles from "./page.module.css";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const suspendedMessage = "Your account has been suspended. Please contact support.";

  function validateForm() {
    let valid = true;

    if (!email.trim()) {
      setEmailError("Please enter your email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }

    return valid;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setFormError("Invalid email or password.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFormError("Invalid email or password.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_suspended")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        setFormError(suspendedMessage);
        return;
      }

      const nextPath = searchParams.get("next");

      if (nextPath && nextPath.startsWith("/")) {
        router.push(nextPath);
        router.refresh();
        return;
      }

      if (profile?.role === "admin") {
        router.push("/admin/dashboard");
      } else if (profile?.role === "consultant") {
        router.push("/consultant/dashboard");
      } else {
        router.push("/user/dashboard");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      setFormError(
        isSupabaseConnectivityError(error)
          ? SUPABASE_CONNECTIVITY_MESSAGE
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Navbar currentPath="/login" />
      <PageContainer>
        <div className={styles.wrapper}>
          <Card className={styles.card}>
            <div className={styles.header}>
              <h1 className={styles.title}>Welcome back</h1>
              <p className={styles.subtitle}>
                Log in to manage your consultations and bookings.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <Input
                autoComplete="email"
                error={emailError}
                label="Email address"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />

              <Input
                autoComplete="current-password"
                error={passwordError}
                label="Password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
              />

              {searchParams.get("suspended") === "1" && !formError ? (
                <p className={styles.formError}>{suspendedMessage}</p>
              ) : null}
              {formError ? <p className={styles.formError}>{formError}</p> : null}

              <Button loading={isSubmitting} type="submit">
                Log in
              </Button>
            </form>

            <p className={styles.footer}>
              New to ConsultLink?{" "}
              <Link className={styles.footerLink} href="/register">
                Create an account
              </Link>
            </p>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar currentPath="/login" />
          <PageContainer>
            <div className={styles.wrapper}>
              <Card className={styles.card}>
                <div className={styles.header}>
                  <h1 className={styles.title}>Welcome back</h1>
                  <p className={styles.subtitle}>Loading login form...</p>
                </div>
              </Card>
            </div>
          </PageContainer>
        </>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
