export type SolBreachLevel = 0 | 1 | 2 | 3;

export type SolBreachCluster = "devnet" | "mainnet-beta" | "localnet";

export interface SolBreachLevelConfig {
  readonly level: SolBreachLevel;
  readonly slug: string;
  readonly title: string;
  readonly certification: string;
  readonly exploitType: string;
  readonly description: string;
  readonly imagePath: string;
}

export interface BuildSolBreachMetadataInput {
  level: SolBreachLevel;
  hackerWallet: string;
  cluster: SolBreachCluster;
  baseUrl: string;
  creatorAddress?: string;
  challengeProgramId?: string;
  merkleTree?: string;
  assetId?: string;
  leafIndex?: number;
  leafNonce?: number;
  issuedAt?: string;
}

export interface SolBreachAttribute {
  trait_type: string;
  value: string;
}

export interface SolBreachMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  attributes: SolBreachAttribute[];
  properties: {
    category: "image";
    files: Array<{
      type: "image/png";
      uri: string;
    }>;
    creators: Array<{
      address: string;
      share: number;
    }>;
  };
  collection: {
    name: string;
    family: string;
  };
  solbreach: {
    project: "SolBreach";
    level: SolBreachLevel;
    levelSlug: string;
    levelTitle: string;
    certification: string;
    exploitType: string;
    hackerWallet: string;
    cluster: SolBreachCluster;
    challengeProgramId: string;
    merkleTree?: string;
    assetId?: string;
    leafIndex?: number;
    leafNonce?: number;
    issuedAt: string;
    transferable: false;
  };
}

const DEFAULT_CHALLENGE_PROGRAM_ID =
  "aVf7hEpHmn7L5ZPBhtu13apZREM7VdwFKzSJ9yNovf2";

const COLLECTION_IMAGE_PATH = "/nfts/certifications.png";
const COLLECTION_NAME = "SolBreach Certifications";
const COLLECTION_FAMILY = "SolBreach";
const SYMBOL = "SBREACH";

export const SOLBREACH_LEVELS: Record<SolBreachLevel, SolBreachLevelConfig> = {
  0: {
    level: 0,
    slug: "hello-solbreach",
    title: "Hello SolBreach",
    certification: "Warmup Cleared",
    exploitType: "Warmup Bootstrap",
    description:
      "Certification NFT for clearing SolBreach Level 0: Hello SolBreach.",
    imagePath: "/nfts/solbreach-level-0-hello-solbreach.png",
  },
  1: {
    level: 1,
    slug: "illusionist",
    title: "The Illusionist",
    certification: "Level 1 Cleared",
    exploitType: "Account Substitution",
    description:
      "Certification NFT for clearing SolBreach Level 1: The Illusionist.",
    imagePath: "/nfts/solbreach-level-1-illusionist.png",
  },
  2: {
    level: 2,
    slug: "identity-thief",
    title: "Identity Thief",
    certification: "Level 2 Cleared",
    exploitType: "Static PDA Hijack",
    description:
      "Certification NFT for clearing SolBreach Level 2: Identity Thief.",
    imagePath: "/nfts/solbreach-level-2-identity-thief.png",
  },
  3: {
    level: 3,
    slug: "trojan-horse",
    title: "The Trojan Horse",
    certification: "Level 3 Cleared",
    exploitType: "Arbitrary CPI",
    description:
      "Certification NFT for clearing SolBreach Level 3: The Trojan Horse.",
    imagePath: "/nfts/solbreach-level-3-trojan-horse.png",
  },
};

export function getSolBreachLevelConfig(level: SolBreachLevel) {
  return SOLBREACH_LEVELS[level];
}

export function getSolBreachImagePath(level: SolBreachLevel) {
  return SOLBREACH_LEVELS[level].imagePath;
}

export function getSolBreachCollectionImagePath() {
  return COLLECTION_IMAGE_PATH;
}

export function buildSolBreachCertificationMetadata(
  input: BuildSolBreachMetadataInput,
): SolBreachMetadata {
  const config = getSolBreachLevelConfig(input.level);
  const baseUrl = trimTrailingSlash(input.baseUrl);
  const imageUrl = `${baseUrl}${config.imagePath}`;
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const challengeProgramId =
    input.challengeProgramId ?? DEFAULT_CHALLENGE_PROGRAM_ID;
  const creators = input.creatorAddress
    ? [
        {
          address: input.creatorAddress,
          share: 100,
        },
      ]
    : [];

  return {
    name: `SolBreach Level ${config.level} Certification`,
    symbol: SYMBOL,
    description: config.description,
    image: imageUrl,
    external_url: `${baseUrl}/`,
    attributes: [
      attribute("Project", "SolBreach"),
      attribute("Level", String(config.level)),
      attribute("Level Name", config.title),
      attribute("Certification", config.certification),
      attribute("Exploit Type", config.exploitType),
      attribute("Cluster", input.cluster),
      attribute("Hacker Wallet", input.hackerWallet),
      attribute("Transferable", "false"),
      ...(input.assetId ? [attribute("Asset ID", input.assetId)] : []),
      ...(input.merkleTree ? [attribute("Merkle Tree", input.merkleTree)] : []),
    ],
    properties: {
      category: "image",
      files: [
        {
          type: "image/png",
          uri: imageUrl,
        },
      ],
      creators,
    },
    collection: {
      name: COLLECTION_NAME,
      family: COLLECTION_FAMILY,
    },
    solbreach: {
      project: "SolBreach",
      level: config.level,
      levelSlug: config.slug,
      levelTitle: config.title,
      certification: config.certification,
      exploitType: config.exploitType,
      hackerWallet: input.hackerWallet,
      cluster: input.cluster,
      challengeProgramId,
      merkleTree: input.merkleTree,
      assetId: input.assetId,
      leafIndex: input.leafIndex,
      leafNonce: input.leafNonce,
      issuedAt,
      transferable: false,
    },
  };
}

export function buildSolBreachCollectionMetadata(baseUrl: string) {
  const normalizedBaseUrl = trimTrailingSlash(baseUrl);
  const imageUrl = `${normalizedBaseUrl}${COLLECTION_IMAGE_PATH}`;

  return {
    name: COLLECTION_NAME,
    symbol: SYMBOL,
    description:
      "Non-transferable certification NFTs issued for clearing SolBreach challenge levels.",
    image: imageUrl,
    external_url: `${normalizedBaseUrl}/`,
    properties: {
      category: "image" as const,
      files: [
        {
          type: "image/png" as const,
          uri: imageUrl,
        },
      ],
    },
    collection: {
      name: COLLECTION_NAME,
      family: COLLECTION_FAMILY,
    },
  };
}

function attribute(trait_type: string, value: string): SolBreachAttribute {
  return { trait_type, value };
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
