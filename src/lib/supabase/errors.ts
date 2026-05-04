export function isSupabaseConnectivityError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    __isAuthError?: boolean;
    code?: string;
    message?: string;
    name?: string;
    status?: number;
  };

  const message = maybeError.message?.toLowerCase() ?? "";

  return (
    maybeError.__isAuthError === true ||
    maybeError.name === "AuthRetryableFetchError" ||
    maybeError.code === "ENOTFOUND" ||
    maybeError.code === "ECONNREFUSED" ||
    maybeError.code === "ETIMEDOUT" ||
    maybeError.status === 0 ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch")
  );
}

export const SUPABASE_CONNECTIVITY_MESSAGE =
  "We couldn't reach Supabase. Check your internet connection and confirm your Supabase URL and keys in .env.local.";
