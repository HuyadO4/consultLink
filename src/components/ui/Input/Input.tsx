"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import styles from "./Input.module.css";

interface BaseInputProps {
  error?: string;
  helperText?: string;
  label: string;
  name: string;
}

interface TextInputProps
  extends BaseInputProps,
    InputHTMLAttributes<HTMLInputElement> {
  multiline?: false;
}

interface TextAreaProps
  extends BaseInputProps,
    TextareaHTMLAttributes<HTMLTextAreaElement> {
  multiline: true;
}

type InputProps = TextInputProps | TextAreaProps;

export function Input(props: InputProps) {
  const { error, helperText, label, multiline = false, name, ...fieldProps } = props;
  const hint = error ?? helperText;
  const describedBy = hint ? `${name}-hint` : undefined;

  return (
    <label className={styles.wrapper} htmlFor={name}>
      <span className={styles.label}>{label}</span>
      {multiline ? (
        <textarea
          {...fieldProps}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={`${styles.field} ${styles.textarea} ${error ? styles.errorField : ""}`}
          id={name}
          name={name}
        />
      ) : (
        <input
          {...fieldProps}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={`${styles.field} ${error ? styles.errorField : ""}`}
          id={name}
          name={name}
        />
      )}
      {hint ? (
        <span className={error ? styles.errorText : styles.helperText} id={describedBy}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
