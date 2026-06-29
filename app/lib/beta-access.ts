import { applyNgrokBypassHeader } from "./backend/ngrok";
import { SOLBREACH_BACKEND_URL } from "./levels/level1-backend";

export type BetaAccessStatus = {
  accessSource: string | null;
  hasAccess: boolean;
  status: "none" | "pending" | "approved" | "revoked";
  walletAddress: string;
};

export type BetaAccessRequestResponse = {
  message: string;
  requestId: string;
  status: "pending";
};

type BetaAccessErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

async function betaAccessRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("content-type") && options.body) {
    headers.set("content-type", "application/json");
  }

  applyNgrokBypassHeader(headers, SOLBREACH_BACKEND_URL);

  const response = await fetch(`${SOLBREACH_BACKEND_URL}${path}`, {
    ...options,
    headers,
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const errorBody = body as BetaAccessErrorBody;
    const message =
      typeof body === "object" && body !== null
        ? errorBody.error?.message ?? errorBody.error?.code ?? response.statusText
        : response.statusText;
    throw new Error(message);
  }

  return body as T;
}

export function getBetaAccessStatus(walletAddress: string) {
  const params = new URLSearchParams({ wallet_address: walletAddress });
  return betaAccessRequest<BetaAccessStatus>(
    `/api/v1/beta-access/status?${params.toString()}`
  );
}

export function requestBetaAccess(walletAddress: string) {
  return betaAccessRequest<BetaAccessRequestResponse>(
    "/api/v1/beta-access/requests",
    {
      body: JSON.stringify({ walletAddress }),
      method: "POST",
    }
  );
}

export function redeemBetaAccessCode({
  code,
  walletAddress,
}: {
  code: string;
  walletAddress: string;
}) {
  return betaAccessRequest<BetaAccessStatus>("/api/v1/beta-access/redeem", {
    body: JSON.stringify({ code, walletAddress }),
    method: "POST",
  });
}
