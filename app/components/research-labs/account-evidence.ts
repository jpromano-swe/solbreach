import type { ResearchLabSession } from "../../lib/research-labs/lab-state";
import type { AccountEvidence } from "./types";

export function buildAccountEvidence(
  session: ResearchLabSession,
  verified: boolean
): AccountEvidence[] {
  const wallet = session.sessionId.slice(0, 4) || "9xQe";
  return [
    {
      id: "signer",
      label: "Investigator Wallet",
      address: `${wallet}...wallet`,
      owner: "System Program",
      role: "Transaction signer",
      authority: "Connected wallet",
      state: [{ label: "Signer", value: "Available" }],
    },
    {
      id: "protocol-state",
      label: "Protocol State",
      address: "PDA...state",
      owner: "Lab Program",
      role: "State account under investigation",
      authority: verified
        ? "Unexpected authority accepted"
        : "Expected authority unknown",
      state: [
        {
          label: "Transition",
          value: "Unverified",
          after: verified ? "Unauthorized transition observed" : undefined,
        },
        {
          label: "Evidence",
          value: "Pending",
          after: verified ? "Captured" : undefined,
        },
      ],
    },
    {
      id: "treasury",
      label: "Protocol Treasury",
      address: "Vault...1111",
      owner: "Lab Program",
      role: "Value-bearing account",
      mint: "Scenario-defined asset",
      state: [
        { label: "Pre-state", value: "Stable" },
        {
          label: "Post-state",
          value: "Pending",
          after: verified ? "State delta detected" : undefined,
        },
      ],
    },
  ];
}
