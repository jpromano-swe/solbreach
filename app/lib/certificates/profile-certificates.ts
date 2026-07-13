import { applyNgrokBypassHeader } from "../backend/ngrok";
import { SOLBREACH_BACKEND_URL } from "../levels/level1-backend";

export type ProfileCertificateStatus =
  | "locked"
  | "minted"
  | "claimable"
  | string;

export type ProfileCertificate = {
  assetId: string | null;
  certificateId: string;
  certificateNumber: number;
  certificatePda: string | null;
  imageUri: string;
  level: 1 | 2 | 3;
  metadataUri: string;
  minted: boolean;
  mintedAt: string | null;
  status: ProfileCertificateStatus;
  title: string;
};

export type ProfileCertificatesSummary = {
  minted: number;
  total: number;
};

export type ProfileCertificatesResponse = {
  certificates: ProfileCertificate[];
  summary: ProfileCertificatesSummary;
  walletAddress: string | null;
};

const CERTIFICATE_FALLBACKS: ProfileCertificate[] = [
  {
    assetId: null,
    certificateId: "solbreach-level-1",
    certificateNumber: 1,
    certificatePda: null,
    imageUri: "/certificates/level-1.png",
    level: 1,
    metadataUri: "/certificates/metadata/level-1.json",
    minted: false,
    mintedAt: null,
    status: "locked",
    title: "The Illusionist",
  },
  {
    assetId: null,
    certificateId: "solbreach-level-2",
    certificateNumber: 2,
    certificatePda: null,
    imageUri: "/certificates/level-2.png",
    level: 2,
    metadataUri: "/certificates/metadata/level-2.json",
    minted: false,
    mintedAt: null,
    status: "locked",
    title: "The Identity Thief",
  },
  {
    assetId: null,
    certificateId: "solbreach-level-3",
    certificateNumber: 3,
    certificatePda: null,
    imageUri: "/certificates/level-3.png",
    level: 3,
    metadataUri: "/certificates/metadata/level-3.json",
    minted: false,
    mintedAt: null,
    status: "locked",
    title: "The Trojan Horse",
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizeLevel(value: unknown, fallback: 1 | 2 | 3): 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3 ? value : fallback;
}

function normalizeCertificate(raw: unknown): ProfileCertificate | null {
  const value = asRecord(raw);
  const certificateId = stringValue(
    value.certificateId ?? value.certificate_id
  );
  const fallback =
    CERTIFICATE_FALLBACKS.find(
      (certificate) => certificate.certificateId === certificateId
    ) ??
    CERTIFICATE_FALLBACKS.find(
      (certificate) =>
        certificate.level === numberValue(value.level, certificate.level)
    );

  if (!certificateId && !fallback) return null;

  const certificateNumber = numberValue(
    value.certificateNumber ?? value.certificate_number,
    fallback?.certificateNumber ?? 1
  );
  const level = normalizeLevel(value.level, fallback?.level ?? 1);

  return {
    assetId: nullableString(value.assetId ?? value.asset_id),
    certificateId: certificateId || fallback?.certificateId || "",
    certificateNumber,
    certificatePda: nullableString(
      value.certificatePda ?? value.certificate_pda
    ),
    imageUri: stringValue(value.imageUri ?? value.image_uri, fallback?.imageUri),
    level,
    metadataUri: stringValue(
      value.metadataUri ?? value.metadata_uri,
      fallback?.metadataUri
    ),
    minted: booleanValue(value.minted),
    mintedAt: nullableString(value.mintedAt ?? value.minted_at),
    status: stringValue(value.status, fallback?.status ?? "locked"),
    title: stringValue(value.title, fallback?.title ?? `Level ${level}`),
  };
}

function mergeCertificateFallbacks(certificates: ProfileCertificate[]) {
  const byId = new Map(
    CERTIFICATE_FALLBACKS.map((certificate) => [
      certificate.certificateId,
      certificate,
    ])
  );

  for (const certificate of certificates) {
    byId.set(certificate.certificateId, {
      ...byId.get(certificate.certificateId),
      ...certificate,
    });
  }

  return Array.from(byId.values()).sort(
    (a, b) => a.certificateNumber - b.certificateNumber
  );
}

function normalizeSummary(
  raw: unknown,
  certificates: ProfileCertificate[]
): ProfileCertificatesSummary {
  const value = asRecord(raw);
  const rawMinted = numberValue(value.minted, -1);
  const minted =
    rawMinted >= 0
      ? rawMinted
      : certificates.filter((certificate) => certificate.minted).length;
  const total = numberValue(value.total, certificates.length);

  return {
    minted,
    total,
  };
}

async function certificatesRequest<T>(path: string, accessToken: string) {
  const headers = new Headers();
  headers.set("authorization", `Bearer ${accessToken}`);
  applyNgrokBypassHeader(headers, SOLBREACH_BACKEND_URL);

  const response = await fetch(`${SOLBREACH_BACKEND_URL}${path}`, {
    headers,
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const errorBody = asRecord(body);
    const error = asRecord(errorBody.error);
    const message =
      stringValue(error.message) ||
      stringValue(error.code) ||
      response.statusText;
    throw new Error(message);
  }

  return body as T;
}

export async function listProfileCertificates(accessToken: string) {
  const raw = await certificatesRequest<unknown>(
    "/api/v1/certificates/me",
    accessToken
  );
  const value = asRecord(raw);
  const rawCertificates = Array.isArray(value.certificates)
    ? value.certificates
    : [];
  const certificates = mergeCertificateFallbacks(
    rawCertificates
      .map(normalizeCertificate)
      .filter(
        (certificate): certificate is ProfileCertificate =>
          Boolean(certificate)
      )
  );

  return {
    certificates,
    summary: normalizeSummary(value.summary, certificates),
    walletAddress: nullableString(value.walletAddress ?? value.wallet_address),
  } satisfies ProfileCertificatesResponse;
}

export function resolveProfileCertificateImage(
  certificate: ProfileCertificate
) {
  if (!certificate.minted) return "/nfts/locked-certification.png";

  const fallback = `/certificates/level-${certificate.level}.png`;
  if (!certificate.imageUri) return fallback;
  if (certificate.imageUri.startsWith("/")) return certificate.imageUri;

  try {
    const url = new URL(certificate.imageUri);
    return url.pathname || fallback;
  } catch {
    return fallback;
  }
}

export function resolveProfileCertificateMetadata(
  certificate: ProfileCertificate
) {
  if (!certificate.metadataUri) {
    return `/certificates/metadata/level-${certificate.level}.json`;
  }

  if (certificate.metadataUri.startsWith("/")) return certificate.metadataUri;

  try {
    return new URL(certificate.metadataUri).pathname;
  } catch {
    return certificate.metadataUri;
  }
}
