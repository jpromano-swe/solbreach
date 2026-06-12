import { expect, test, type Page, type Route } from "@playwright/test";

const SESSION_ID = "e2e-rl1-session-001";
const AUTH_TOKEN = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJtb2NrIn0.";
const WALLET_ADDRESS = "9xQeQgcg6GxLxnP46gfK1CmVs5PKoYpFrc59KJdkw4Xt";

type PendingTransaction = {
  instructionType: "DEPOSIT_COLLATERAL" | "WITHDRAW_AGAINST_CREDIT";
  status: "success" | "failure";
  logs: string[];
};

type PendingVerify = {
  passed: boolean;
  reportUnlocked: boolean;
  verifiedEvidenceRefs: string[];
};

let pendingTransaction: PendingTransaction | null = null;
let pendingVerify: PendingVerify | null = null;

function resetState() {
  pendingTransaction = null;
  pendingVerify = null;
}

async function seedAuth(page: Page) {
  await page.addInitScript(
    ({ token, walletAddress }) => {
      localStorage.setItem(
        "solbreach.backend.walletAuth",
        JSON.stringify({
          accessToken: token,
          refreshToken: token,
          walletAddress,
        })
      );
      localStorage.setItem("solana:last-connector", "E2E Mock Wallet");

      window.addEventListener("wallet-standard:app-ready", (event) => {
        const register = (event as CustomEvent).detail.register;
        register({
          version: "1.0.0",
          name: "E2E Mock Wallet",
          icon:
            "data:image/svg+xml;base64," +
            btoa(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#9945FF"/></svg>'
            ),
          chains: ["solana:mainnet"],
          features: {
            "standard:connect": {
              version: "1.0.0",
              connect: async () => ({
                accounts: [
                  {
                    address: walletAddress,
                    publicKey: new Uint8Array(32),
                    chains: ["solana:mainnet"],
                    features: [
                      "solana:signTransaction",
                      "solana:signAndSendTransaction",
                      "solana:signMessage",
                    ],
                  },
                ],
              }),
            },
            "standard:disconnect": {
              version: "1.0.0",
              disconnect: async () => {},
            },
            "solana:signTransaction": {
              version: "1.0.0",
              signTransaction: async ({
                transaction,
              }: {
                transaction: Uint8Array;
              }) => ({
                signedTransaction: transaction,
              }),
            },
            "solana:signAndSendTransaction": {
              version: "1.0.0",
              signAndSendTransaction: async () => {
                const sig = new Uint8Array(64);
                sig.fill(42);
                return { signature: sig };
              },
            },
            "solana:signMessage": {
              version: "1.0.0",
              signMessage: async () => {
                const sig = new Uint8Array(64);
                sig.fill(42);
                return [{ signature: sig }];
              },
            },
          },
          accounts: [],
        });
      });
    },
    { token: AUTH_TOKEN, walletAddress: WALLET_ADDRESS }
  );
}

async function setupApiMocks(page: Page) {
  resetState();

  await page.route("**/api/v1/**", async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (
      url.includes("/auth/nonce") ||
      url.includes("/auth/verify") ||
      url.includes("/auth/refresh")
    ) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { role: "user", wallet_address: WALLET_ADDRESS },
          tokens: { access_token: AUTH_TOKEN, refresh_token: AUTH_TOKEN },
        }),
      });
    }

    if (url.match(/\/api\/v1\/research-labs$/) && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "rl1-account-substitution",
              slug: "account-substitution",
              title: "Account Substitution",
              difficulty: "intermediate",
              estimated_time: "2-4 hours",
              xp_reward: 250,
              status: "active",
              summary:
                "A borrow market accepts caller-supplied collateral accounts without binding them to the approved vault configuration.",
              objective:
                "Determine whether a counterfeit deposit path can create position credit and support a real treasury withdrawal.",
              allowed_files: ["programs/account_substitution/src/lib.rs"],
              entry_file: "programs/account_substitution/src/lib.rs",
              test_command: "anchor test --skip-deploy",
              success_criteria:
                "Verified evidence must show that a non-canonical deposit path changed position credit and enabled a treasury withdrawal before the report is accepted.",
              template_ref: "research-labs/account-substitution@v1",
              objectives: [
                "Inspect the deposit instruction and the trusted account boundary",
                "Identify the missing binding between source, vault, and approved config",
                "Execute the non-canonical deposit and borrow path",
                "Review the sandbox evidence and document the finding",
              ],
              hints: [
                {
                  id: "account-binding",
                  title: "Hint 1",
                  body: "Start by comparing the collateral account you provide with the vault that receives it.",
                },
              ],
              files: [
                {
                  path: "programs/account_substitution/src/lib.rs",
                  language: "rust",
                  content: "#[program]\npub mod account_substitution {}\n",
                  writable: true,
                },
              ],
            },
          ],
          error: null,
        }),
      });
    }

    if (
      url.includes("/research-labs/rl1-account-substitution") &&
      !url.includes("/sessions")
    ) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "rl1-account-substitution",
            slug: "account-substitution",
            title: "Account Substitution",
            difficulty: "intermediate",
            estimated_time: "2-4 hours",
            xp_reward: 250,
            status: "active",
            summary:
              "A borrow market accepts caller-supplied collateral accounts without binding them to the approved vault configuration.",
            objective:
              "Determine whether a counterfeit deposit path can create position credit and support a real treasury withdrawal.",
            allowed_files: ["programs/account_substitution/src/lib.rs"],
            entry_file: "programs/account_substitution/src/lib.rs",
            test_command: "anchor test --skip-deploy",
            success_criteria:
              "Verified evidence must show that a non-canonical deposit path changed position credit and enabled a treasury withdrawal before the report is accepted.",
            template_ref: "research-labs/account-substitution@v1",
            objectives: [
              "Inspect the deposit instruction and the trusted account boundary",
              "Identify the missing binding between source, vault, and approved config",
            ],
            hints: [],
            files: [],
          },
          error: null,
        }),
      });
    }

    if (url.includes("/verify-objective")) {
      const verify =
        pendingVerify ?? {
          passed: false,
          reportUnlocked: false,
          verifiedEvidenceRefs: [],
        };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            session_id: SESSION_ID,
            passed: verify.passed,
            impactVerified: verify.passed,
            reportUnlocked: verify.reportUnlocked,
            verifiedEvidenceRefs: verify.verifiedEvidenceRefs,
            status: verify.passed ? "passed" : "failed",
            objective_progress: verify.passed ? 4 : 2,
            session_status: verify.passed ? "passed" : "failed",
            report_status: verify.reportUnlocked ? "draft" : "locked",
          },
          error: null,
        }),
      });
    }

    if (url.endsWith("/report/submit")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            session_id: SESSION_ID,
            status: "accepted",
            lab_completed: true,
            xp_awarded: 250,
            feedback:
              "Report accepted. Vulnerability, impact, and remediation are correctly identified.",
          },
          error: null,
        }),
      });
    }

    if (url.endsWith("/report") && method === "PUT") {
      const body = route.request().postDataJSON() as {
        fields: Record<string, unknown>;
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            session_id: SESSION_ID,
            status: "draft",
            fields: body.fields,
            feedback: null,
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      });
    }

    if (url.endsWith("/report") && method === "GET") {
      const unlocked = pendingVerify?.reportUnlocked ?? false;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: unlocked
            ? {
                session_id: SESSION_ID,
                status: "draft",
                fields: {
                  titleOptionId: null,
                  categoryOptionId: null,
                  severityOptionId: null,
                  likelihoodOptionId: null,
                  rootCauseOptionId: null,
                  proofOfImpactOptionId: null,
                  recommendedMitigationOptionId: null,
                  verifiedEvidenceRefs:
                    pendingVerify?.verifiedEvidenceRefs ?? [],
                  optionalNotes: "",
                },
                allowed_values: {
                  title_option_id: [
                    "missing_constraints_counterfeit_credit",
                  ],
                  category_option_id: ["account_substitution"],
                  severity_option_id: ["high_treasury_loss", "high"],
                  likelihood_option_id: [
                    "medium_high_attacker_supplied_accounts",
                  ],
                  root_cause_option_id: ["missing_account_binding"],
                  proof_of_impact_option_id: [
                    "counterfeit_credit_withdraws_treasury",
                  ],
                  recommended_mitigation_option_id: [
                    "bind_accounts_to_approved_config",
                  ],
                },
                feedback: null,
              }
            : {
                session_id: SESSION_ID,
                status: "locked",
                fields: null,
                allowed_values: null,
                feedback: "Pass impact verification to unlock the report.",
              },
          error: null,
        }),
      });
    }

    if (url.includes("/reset")) {
      resetState();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: sessionPayload(),
          error: null,
        }),
      });
    }

    if (
      url.includes("/sessions") &&
      method === "POST" &&
      !url.includes("/transactions")
    ) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: sessionPayload(),
          error: null,
        }),
      });
    }

    if (
      url.includes(SESSION_ID) &&
      method === "GET" &&
      !url.includes("/terminal") &&
      !url.includes("/report") &&
      !url.includes("/accounts") &&
      !url.includes("/transactions")
    ) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: sessionPayload(),
          error: null,
        }),
      });
    }

    if (url.includes("/terminal")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { events: [], latest_sequence: 0 },
          error: null,
        }),
      });
    }

    if (url.includes("/transactions") && method === "POST") {
      const tx =
        pendingTransaction ?? {
          instructionType: "DEPOSIT_COLLATERAL" as const,
          status: "success" as const,
          logs: ["Mock sandbox success"],
        };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            transaction_ref: `mock-${tx.instructionType.toLowerCase()}`,
            instruction_type: tx.instructionType,
            execution_status: tx.status,
            logs: tx.logs,
          },
          error: null,
        }),
      });
    }

    if (url.includes("/accounts")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            accounts: [
              {
                ref: "official_vault_account",
                label: "Protocol USDC Vault",
                owner: "Lab Program",
                lamports: 1_000_000,
                data: { liquidity: "100000 USDC" },
              },
              {
                ref: "attacker_collateral_account",
                label: "Injected IJC Source",
                owner: "Attacker",
                lamports: 500_000,
                data: { amount: "50000 IJC" },
              },
            ],
          },
          error: null,
        }),
      });
    }

    return route.fulfill({ status: 404, body: "Not mocked" });
  });
}

function sessionPayload() {
  return {
    session_id: SESSION_ID,
    lab_id: "rl1-account-substitution",
    status: "active",
    stage: "investigate",
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    files: [
      {
        path: "programs/account_substitution/src/lib.rs",
        language: "rust",
        content: "#[program]\npub mod account_substitution {}\n",
        writable: true,
      },
    ],
    terminal: [],
    latest_sequence: 0,
    test_results: [],
    objective_progress: 1,
    report_status: "locked",
  };
}

async function openResearchLab(page: Page) {
  await page.goto("/?section=research-labs", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await expect(page.getByText("Supported protocol investigations.")).toBeVisible();
  await expect(page.getByRole("button", { name: /RL1/i })).toBeVisible();
  await page.getByRole("button", { name: /RL1/i }).click();
  await expect(page.getByRole("button", { name: "Execute Exploit" })).toBeVisible();
}

test("RL1 catalog and workspace use account substitution copy", async ({
  page,
}) => {
  await seedAuth(page);
  await setupApiMocks(page);
  await openResearchLab(page);

  await expect(page.getByText("Account Substitution")).toBeVisible();
  await expect(
    page.getByText(/caller-supplied collateral accounts/i)
  ).toBeVisible();
  await expect(
    page.getByText("Build Audit Report")
  ).not.toBeVisible();
  await expect(page.getByText("Vault Mirage")).toHaveCount(0);
  await expect(page.getByText(/arithmetic safety/i)).toHaveCount(0);
});

test("RL1 verify flow unlocks deterministic report builder", async ({
  page,
}) => {
  await seedAuth(page);
  await setupApiMocks(page);
  await openResearchLab(page);

  pendingTransaction = {
    instructionType: "DEPOSIT_COLLATERAL",
    status: "success",
    logs: ["Deposit executed"],
  };

  await page.getByRole("button", { name: "Execute Exploit" }).click();
  await page.getByLabel("Token").selectOption("attacker_collateral_account");
  await page.getByLabel("Vault").selectOption("counterfeit_vault_account");
  await page.getByRole("button", { name: "Deposit" }).click();

  pendingTransaction = {
    instructionType: "WITHDRAW_AGAINST_CREDIT",
    status: "success",
    logs: ["Borrow executed"],
  };

  await page.getByRole("button", { name: /Borrow/i }).click();
  await page.getByRole("button", { name: /Review Evidence/i }).click();

  pendingVerify = {
    passed: true,
    reportUnlocked: true,
    verifiedEvidenceRefs: ["deposit_tx", "borrow_tx"],
  };

  await page.getByRole("button", { name: "Verify Impact" }).click();
  await page.getByRole("button", { name: /Continue to Submit Finding/i }).click();
  await page.getByRole("button", { name: /Build Audit Report/i }).click();

  await expect(
    page.getByRole("heading", { name: "Build Audit Report" })
  ).toBeVisible();
  await expect(
    page.getByText("Missing Constraints Allow Counterfeit Credit")
  ).toBeVisible();
  await expect(
    page.getByText("Bind accounts to approved config")
  ).toBeVisible();
  await expect(page.getByText("Vault Mirage")).toHaveCount(0);
  await expect(page.getByText(/vault health calculation/i)).toHaveCount(0);
});
