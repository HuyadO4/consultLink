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

type IntendedRole = "customer" | "consultant";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [intendedRole, setIntendedRole] = useState<IntendedRole>(
    searchParams.get("role") === "consultant" ? "consultant" : "customer"
  );
  const [fullNameError, setFullNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateForm() {
    let valid = true;

    if (fullName.trim().length < 2) {
      setFullNameError("Please enter your full name.");
      valid = false;
    } else {
      setFullNameError("");
    }

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: intendedRole,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          setFormError("An account with this email already exists.");
        } else {
          setFormError("Something went wrong. Please try again.");
        }
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ role: intendedRole })
          .eq("id", data.user.id);

        if (profileError) {
          console.error(profileError);
        }
      }

      router.push(intendedRole === "consultant" ? "/consultant/dashboard" : "/listings");
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
      <Navbar currentPath="/register" />
      <PageContainer>
        <div className={styles.wrapper}>
          <Card className={styles.card}>
            <div className={styles.header}>
              <h1 className={styles.title}>Create your account</h1>
              <p className={styles.subtitle}>
                Start booking or offering expert business consultations.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <Input
                autoComplete="name"
                error={fullNameError}
                label="Full name"
                name="fullName"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                value={fullName}
              />

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
                autoComplete="new-password"
                error={passwordError}
                label="Password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                type="password"
                value={password}
              />

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>I want to</legend>
                <label className={styles.radioOption} htmlFor="role-customer">
                  <input
                    checked={intendedRole === "customer"}
                    id="role-customer"
                    name="role"
                    onChange={() => setIntendedRole("customer")}
                    type="radio"
                  />
                  <span>Book consultations as a customer</span>
                </label>
                <label className={styles.radioOption} htmlFor="role-consultant">
                  <input
                    checked={intendedRole === "consultant"}
                    id="role-consultant"
                    name="role"
                    onChange={() => setIntendedRole("consultant")}
                    type="radio"
                  />
                  <span>Offer consultations as a consultant</span>
                </label>
              </fieldset>

              {formError ? <p className={styles.formError}>{formError}</p> : null}

              <Button loading={isSubmitting} type="submit">
                Create account
              </Button>
            </form>

            <p className={styles.footer}>
              Already have an account?{" "}
              <Link className={styles.footerLink} href="/login">
                Log in
              </Link>
            </p>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar currentPath="/register" />
          <PageContainer>
            <div className={styles.wrapper}>
              <Card className={styles.card}>
                <div className={styles.header}>
                  <h1 className={styles.title}>Create your account</h1>
                  <p className={styles.subtitle}>Loading registration form...</p>
                </div>
              </Card>
            </div>
          </PageContainer>
        </>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
