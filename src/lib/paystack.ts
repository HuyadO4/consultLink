import { createHmac, timingSafeEqual } from "node:crypto";

interface InitializeTransactionArgs {
  amount: number;
  callbackUrl: string;
  email: string;
  metadata?: Record<string, string>;
  reference: string;
}

interface InitializeTransactionData {
  access_code: string;
  authorization_url?: string;
  reference: string;
}

interface PaystackInitializePayload {
  data?: InitializeTransactionData;
  message?: string;
  status?: boolean;
}

interface VerifyTransactionData {
  amount?: number;
  currency?: string;
  paid_at?: string | null;
  reference: string;
  status: string;
}

interface PaystackVerifyPayload {
  data?: VerifyTransactionData;
  message?: string;
  status?: boolean;
}

const PAYSTACK_API_BASE_URL = "https://api.paystack.co";

function getPaystackSecretKey() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing PAYSTACK_SECRET_KEY");
  }

  return secretKey;
}

function getPaystackWebhookSecret() {
  return process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.PAYSTACK_SECRET_KEY ?? "";
}

async function paystackRequest<T>(path: string, init: RequestInit) {
  const response = await fetch(`${PAYSTACK_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as T;

  return {
    payload,
    response,
  };
}

export async function initializePaystackTransaction({
  amount,
  callbackUrl,
  email,
  metadata,
  reference,
}: InitializeTransactionArgs): Promise<InitializeTransactionData> {
  const { payload, response } = await paystackRequest<PaystackInitializePayload>(
    "/transaction/initialize",
    {
      body: JSON.stringify({
        amount,
        callback_url: callbackUrl,
        currency: "NGN",
        email,
        metadata,
        reference,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  );

  if (!response.ok || !payload.status || !payload.data?.access_code || !payload.data.reference) {
    throw new Error(payload.message ?? "Unable to initialize Paystack transaction");
  }

  return payload.data;
}

export async function verifyPaystackTransaction(
  reference: string
): Promise<VerifyTransactionData> {
  const { payload, response } = await paystackRequest<PaystackVerifyPayload>(
    `/transaction/verify/${reference}`,
    {
      method: "GET",
    }
  );

  if (!response.ok || !payload.status || !payload.data?.reference || !payload.data.status) {
    throw new Error(payload.message ?? "Unable to verify Paystack transaction");
  }

  return payload.data;
}

export function isValidPaystackSignature(rawBody: string, signature: string | null) {
  const secret = getPaystackWebhookSecret();

  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = createHmac("sha512", secret).update(rawBody).digest("hex");

  if (expectedSignature.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
}
