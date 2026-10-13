import { getBase58Decoder } from "@solana/kit";
import type { WalletSession } from "../wallet/types";

export async function signCertificateMint(
  wallet: WalletSession,
  level: number
) {
  if (!wallet.signMessage)
    throw new Error(
      "This wallet must support signing messages to mint certificates."
    );
  const issuedAt = Math.floor(Date.now() / 1000);
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  const message = `SolBreach certificate mint authorization v1\nWallet: ${wallet.account.address}\nLevel: ${level}\nCluster: devnet\nIssued at: ${issuedAt}\nNonce: ${nonce}`;
  const signature = await wallet.signMessage(new TextEncoder().encode(message));
  return {
    mintAuthorizationSignature: getBase58Decoder().decode(signature),
    mintAuthorizationIssuedAt: issuedAt,
    mintAuthorizationNonce: nonce,
  };
}
