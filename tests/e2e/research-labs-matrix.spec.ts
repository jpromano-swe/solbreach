import { test, expect, type Page, type Route } from "@playwright/test";

const SESSION_ID = "e2e-mock-session-001";
const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtb2NrIn0.no-exp-claim"; // jwt with no exp

// Fake JWT: header + payload (no exp field) + signature — never "expired"
const FAKE_JWT = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJtb2NrIn0.";

type TxDef = { instructionType: string; status: "success" | "failure"; logs: string[] };
type VerifyDef = { passed: boolean; reportUnlocked: boolean };

let pendingTx: TxDef | null = null;
let pendingVerify: VerifyDef | null = null;
let isReset = false;

function resetState() { pendingTx = null; pendingVerify = null; isReset = false; }
function scheduleTx(def: TxDef) { pendingTx = def; }
function scheduleVerify(def: VerifyDef) { pendingVerify = def; }

async function seedAuth(page: Page) {
  await page.addInitScript((token: string) => {
    // Seed localStorage with valid auth (skips API auth calls)
    const auth = JSON.stringify({
      accessToken: token,
      refreshToken: token,
      walletAddress: "9xQeQgcg6GxLxnP46gfK1CmVs5PKoYpFrc59KJdkw4Xt",
    });
    localStorage.setItem("solbreach.backend.walletAuth", auth);

    // Set auto-connect key so WalletProvider automatically connects our mock wallet
    localStorage.setItem("solana:last-connector", "E2E Mock Wallet");

    // Register mock wallet via the wallet-standard protocol.
    // @wallet-standard/app's getWallets() dispatches 'wallet-standard:app-ready'
    // on first call (during useState initializer in WalletProvider).
    // This listener fires synchronously at that point and registers the wallet.
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
                  address: "9xQeQgcg6GxLxnP46gfK1CmVs5PKoYpFrc59KJdkw4Xt",
                  publicKey: new Uint8Array(32),
                  chains: ["solana:mainnet"],
                  features: [
                    "solana:signTransaction",
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
            signTransaction: async ({ transaction }: { transaction: Uint8Array }) => ({
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
  }, FAKE_JWT);
}

async function setupApiMocks(page: Page) {
  resetState();

  await page.route("**/api/v1/**", async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Auth endpoints — should not be hit with pre-seeded auth, but handle gracefully
    if (url.includes("/auth/nonce") || url.includes("/auth/verify") || url.includes("/auth/refresh")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ user: { role: "hacker", wallet_address: "9xQeQgcg6GxLxnP46gfK1CmVs5PKoYpFrc59KJdkw4Xt" }, tokens: { access_token: AUTH_TOKEN, refresh_token: AUTH_TOKEN } }) });
    }

    // Research Labs catalog
    if (url.match(/\/api\/v1\/research-labs$/) && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: [{
          id: "rl-007", slug: "vault-mirage", title: "Vault Mirage", difficulty: "intermediate",
          estimated_time: "2-4 hours", xp_reward: 250, status: "active",
          summary: "A lending protocol reports suspicious vault health calculations.",
          objective: "Identify and fix the arithmetic flaw.",
          allowed_files: ["programs/vault_mirage/src/lib.rs"],
          entry_file: "programs/vault_mirage/src/lib.rs",
          test_command: "anchor test --skip-deploy",
          success_criteria: "Collateral value must use checked arithmetic.",
          template_ref: "research-labs/vault-mirage@v1",
          objectives: ["Inspect", "Fix"],
          hints: [{ id: "hint-1", title: "Hint 1", body: "Focus on the deposit path." }],
          files: [{ path: "programs/vault_mirage/src/lib.rs", language: "rust", content: "// mock", writable: true }],
        }] }) });
    }

    // Lab detail
    if (url.includes("/research-labs/rl-007") && !url.includes("/sessions")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: { id: "rl-007", slug: "vault-mirage", title: "Vault Mirage", difficulty: "intermediate", estimated_time: "2-4 hours", xp_reward: 250, status: "active", summary: "Test vault behavior.", objective: "Test protocol state transitions.", allowed_files: ["programs/vault_mirage/src/lib.rs"], entry_file: "programs/vault_mirage/src/lib.rs", test_command: "anchor test", success_criteria: "Must use checked arithmetic.", template_ref: "test", objectives: ["Inspect", "Fix"], hints: [], files: [] } }) });
    }

    // Verify objective — must come BEFORE /sessions POST since both match
    if (url.includes("/verify-objective")) {
      const v = pendingVerify ?? { passed: false, reportUnlocked: false };
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: {
          session_id: SESSION_ID, passed: v.passed, phase: v.passed ? "REPORT" : "PROVE_IMPACT",
          exploitVerified: v.passed, reportUnlocked: v.reportUnlocked,
          userFacingEvidence: v.passed ? ["Unauthorized state transition detected"] : [],
          status: v.passed ? "passed" : "failed", objective_progress: v.passed ? 2 : 1,
          session_status: v.passed ? "passed" : "failed", report_status: v.reportUnlocked ? "draft" : "locked",
        } }) });
    }

    // Reset session — must come BEFORE /sessions POST since reset uses POST + /sessions
    if (url.includes("/reset")) {
      isReset = true; pendingTx = null; pendingVerify = null;
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: { ...sessionPayload(), status: "active", stage: "investigate", objective_progress: 0 } }) });
    }

    // Create session
    if (url.includes("/sessions") && method === "POST" && !url.includes("/transactions")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: sessionPayload() }) });
    }

    // Get session
    if (url.includes(SESSION_ID) && method === "GET" && !url.includes("/terminal") && !url.includes("/report") && !url.includes("/accounts") && !url.includes("/transactions")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: sessionPayload() }) });
    }

    // Terminal
    if (url.includes("/terminal")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: { events: [], latest_sequence: 0 } }) });
    }

    // Report
    if (url.includes("/report") && !url.includes("verify") && !url.includes("object")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: isReset
          ? { session_id: SESSION_ID, status: "locked", fields: null, allowed_values: {}, feedback: null }
          : pendingVerify?.reportUnlocked
            ? { session_id: SESSION_ID, status: "draft", fields: null, allowed_values: { vulnerability_category: ["missing_validation", "arithmetic_safety"], affected_area: ["deposit_instruction", "vault_health_calculation"], severity: ["low", "medium", "high"] }, feedback: null }
            : { session_id: SESSION_ID, status: "locked", fields: null, allowed_values: {}, feedback: null } }) });
    }

    // Submit transaction
    if (url.includes("/transactions") && method === "POST") {
      const tx = pendingTx ?? { instructionType: "DEPOSIT_COLLATERAL", status: "success", logs: ["Mock OK"] };
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: {
          transaction_ref: `mock-${Date.now()}`, transactionRef: `mock-${Date.now()}`,
          instruction_type: tx.instructionType, instructionType: tx.instructionType,
          execution_status: tx.status, executionStatus: tx.status,
          logs: tx.logs, userFacingEvidence: [],
        } }) });
    }

    // Accounts
    if (url.includes("/accounts")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: { accounts: [
          { ref: "official_vault_account", label: "Protocol Collateral Vault", owner: "Lab Program", lamports: 1_000_000, data: {} },
          { ref: "attacker_collateral_account", label: "Candidate Collateral Account", owner: "Lab Program", lamports: 500_000, data: {} },
          { ref: "credit_position", label: "Credit Position", owner: "Lab Program", lamports: 0, data: { credit_position: "10,000" } },
        ] } }) });
    }

    return route.fulfill({ status: 404, body: "Not mocked" });
  });
}

function sessionPayload() {
  return {
    session_id: SESSION_ID, lab_id: "rl-007", status: "active", stage: "investigate",
    expires_at: new Date(Date.now() + 7200000).toISOString(),
    files: [{ path: "programs/vault_mirage/src/lib.rs", language: "rust", content: "// mock", writable: true }],
    terminal: [], latest_sequence: 0, test_results: [], objective_progress: 1,
  };
}

async function navigateToExploitTab(page: Page) {
  await page.goto("/?section=research-labs", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Should see the catalog. Find the "Refresh labs" or "Authenticate wallet" button.
  // With pre-seeded auth, the button says "Refresh labs"
  const refreshBtn = page.locator("button", { hasText: /Refresh labs|Authenticate/ });
  if (await refreshBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await refreshBtn.click();
    await page.waitForTimeout(3000);
  }

  // Click the Vault Mirage lab card in the catalog (use RL-007 to avoid matching the sidebar entry)
  const labCard = page.locator("button", { hasText: /^RL-007/ });
  await expect(labCard).toBeVisible({ timeout: 10000 });
  await labCard.click();
  await page.waitForTimeout(3000);

  // Switch to Exploit tab (tabs are plain buttons without role=tab)
  const exploitTab = page.locator("button", { hasText: "Exploit" }).first();
  await expect(exploitTab).toBeVisible({ timeout: 5000 });
  await exploitTab.click();
  await page.waitForTimeout(800);
}

// ════════════════════════════════════════════════════════
test("matrix 1: dropdowns have no preselected value, neutral labels only", async ({ page }) => {
  await seedAuth(page);
  await setupApiMocks(page);
  await navigateToExploitTab(page);

  const selects = page.locator("select");
  await expect(selects.nth(0)).toHaveValue("");
  await expect(selects.nth(1)).toHaveValue("");

  // Verify neutral labels are present in <option> elements (hidden until dropdown opens)
  await expect(selects.nth(0).locator("option")).toHaveText([
    "Select a collateral source account",
    "Approved Collateral Account",
    "Candidate Collateral Account",
  ]);
  await expect(selects.nth(1).locator("option")).toHaveText([
    "Select a vault destination account",
    "Protocol Collateral Vault",
    "External Vault Candidate",
  ]);

  await expect(page.locator("button", { hasText: "Deposit Collateral" })).toBeDisabled();
  await expect(page.locator("button", { hasText: "Withdraw Against Credit" })).toBeDisabled();
});

// ════════════════════════════════════════════════════════
test("matrix 2: official deposit + withdrawal fails verify", async ({ page }) => {
  await seedAuth(page);
  await setupApiMocks(page);
  await navigateToExploitTab(page);

  await page.locator("select").nth(0).selectOption("official_collateral_account");
  await page.locator("select").nth(1).selectOption("official_vault_account");

  scheduleTx({ instructionType: "DEPOSIT_COLLATERAL", status: "success", logs: ["Program log: deposit executed"] });
  await page.locator("button", { hasText: "Deposit Collateral" }).click();
  await page.waitForTimeout(1500);
  await expect(page.getByText("Executed")).toBeVisible({ timeout: 3000 });

  scheduleTx({ instructionType: "WITHDRAW_AGAINST_CREDIT", status: "success", logs: ["Program log: withdrawal executed"] });
  await expect(page.locator("button", { hasText: "Withdraw Against Credit" })).not.toBeDisabled({ timeout: 3000 });
  await page.locator("button", { hasText: "Withdraw Against Credit" }).click();
  await page.waitForTimeout(1500);

  scheduleVerify({ passed: false, reportUnlocked: false });
  await page.locator("button", { hasText: "Verify Impact" }).click();
  await page.waitForTimeout(2000);
  await expect(page.getByRole("button", { name: "Report", exact: true })).not.toBeVisible({ timeout: 3000 });
});

// ════════════════════════════════════════════════════════
test("matrix 3: mint-mismatch paths display runtime failure logs", async ({ page }) => {
  await seedAuth(page);
  await setupApiMocks(page);
  await navigateToExploitTab(page);

  await page.locator("select").nth(0).selectOption("official_collateral_account");
  await page.locator("select").nth(1).selectOption("counterfeit_vault_account");
  scheduleTx({ instructionType: "DEPOSIT_COLLATERAL", status: "failure",
    logs: ["Program log: mint address mismatch", "Program log: expected mint Gz3r but received HoLp", "Instruction failed: custom error 0x1771"] });
  await page.locator("button", { hasText: "Deposit Collateral" }).click();
  await page.waitForTimeout(1500);
  await expect(page.getByText("Failed")).toBeVisible();

  // Expand transaction card to verify failure log content
  await page.getByText("Transaction Results").locator("..").locator("button").filter({ has: page.locator("svg") }).first().click();
  await page.waitForTimeout(200);
  await expect(page.getByText("mint address mismatch")).toBeVisible({ timeout: 3000 });

  await page.locator("select").nth(0).selectOption("attacker_collateral_account");
  await page.locator("select").nth(1).selectOption("official_vault_account");
  scheduleTx({ instructionType: "DEPOSIT_COLLATERAL", status: "failure",
    logs: ["Program log: mint authority check failed", "Program log: collateral mint does not match vault mint", "Instruction failed: custom error 0x1772"] });
  await page.locator("button", { hasText: "Deposit Collateral" }).click();
  await page.waitForTimeout(1500);
  await expect(page.getByText("Failed")).toBeVisible();
  // Expand second transaction card
  await page.getByText("Transaction Results").locator("..").locator("button").filter({ has: page.locator("svg") }).nth(1).click();
  await page.waitForTimeout(200);
  await expect(page.getByText("mint authority check failed")).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("collateral mint does not match vault mint")).toBeVisible();
});

// ════════════════════════════════════════════════════════
test("matrix 4: counterfeit deposit succeeds, report stays locked", async ({ page }) => {
  await seedAuth(page);
  await setupApiMocks(page);
  await navigateToExploitTab(page);

  await page.locator("select").nth(0).selectOption("attacker_collateral_account");
  await page.locator("select").nth(1).selectOption("counterfeit_vault_account");
  scheduleTx({ instructionType: "DEPOSIT_COLLATERAL", status: "success",
    logs: ["Program log: deposit executed against external vault", "Program log: credit position updated"] });
  await page.locator("button", { hasText: "Deposit Collateral" }).click();
  await page.waitForTimeout(1500);
  await expect(page.getByText("Executed")).toBeVisible({ timeout: 3000 });
  // Logs are inside collapsed expandable section — check DOM presence not visibility
  await expect(page.getByText("credit position updated")).toBeAttached();
  await expect(page.getByRole("button", { name: "Report", exact: true })).not.toBeVisible({ timeout: 3000 });
});

// ════════════════════════════════════════════════════════
test("matrix 5: counterfeit deposit only fails verify impact", async ({ page }) => {
  await seedAuth(page);
  await setupApiMocks(page);
  await navigateToExploitTab(page);

  await page.locator("select").nth(0).selectOption("attacker_collateral_account");
  await page.locator("select").nth(1).selectOption("counterfeit_vault_account");
  scheduleTx({ instructionType: "DEPOSIT_COLLATERAL", status: "success", logs: ["Deposit OK"] });
  await page.locator("button", { hasText: "Deposit Collateral" }).click();
  await page.waitForTimeout(1500);
  scheduleVerify({ passed: false, reportUnlocked: false });
  await page.locator("button", { hasText: "Verify Impact" }).click();
  await page.waitForTimeout(2000);
  await expect(page.getByRole("button", { name: "Report", exact: true })).not.toBeVisible({ timeout: 3000 });
});

// ════════════════════════════════════════════════════════
test("matrix 6: counterfeit deposit + withdrawal passes verify, unlocks report", async ({ page }) => {
  await seedAuth(page);
  await setupApiMocks(page);
  await navigateToExploitTab(page);

  await page.locator("select").nth(0).selectOption("attacker_collateral_account");
  await page.locator("select").nth(1).selectOption("counterfeit_vault_account");
  scheduleTx({ instructionType: "DEPOSIT_COLLATERAL", status: "success", logs: ["Deposit: counterfeit OK"] });
  await page.locator("button", { hasText: "Deposit Collateral" }).click();
  await page.waitForTimeout(1500);
  await expect(page.getByText("Executed")).toBeVisible({ timeout: 3000 });

  scheduleTx({ instructionType: "WITHDRAW_AGAINST_CREDIT", status: "success", logs: ["Withdrawal: against credit OK"] });
  await expect(page.locator("button", { hasText: "Withdraw Against Credit" })).not.toBeDisabled({ timeout: 3000 });
  await page.locator("button", { hasText: "Withdraw Against Credit" }).click();
  await page.waitForTimeout(1500);

  scheduleVerify({ passed: true, reportUnlocked: true });
  await page.locator("button", { hasText: "Verify Impact" }).click();
  await page.waitForTimeout(3000);

  const reportTab = page.getByRole("button", { name: "Report", exact: true });
  await reportTab.click();
  await page.waitForTimeout(800);
  await expect(page.getByText("Document the verified protocol failure")).toBeVisible({ timeout: 3000 });
});

// ════════════════════════════════════════════════════════
test("matrix 7: reset relocks report and restores clean state", async ({ page }) => {
  await seedAuth(page);
  await setupApiMocks(page);
  await navigateToExploitTab(page);

  await page.locator("select").nth(0).selectOption("attacker_collateral_account");
  await page.locator("select").nth(1).selectOption("counterfeit_vault_account");
  scheduleTx({ instructionType: "DEPOSIT_COLLATERAL", status: "success", logs: ["Deposit OK"] });
  await page.locator("button", { hasText: "Deposit Collateral" }).click();
  await page.waitForTimeout(1000);

  scheduleTx({ instructionType: "WITHDRAW_AGAINST_CREDIT", status: "success", logs: ["Withdrawal OK"] });
  await page.locator("button", { hasText: "Withdraw Against Credit" }).click();
  await page.waitForTimeout(1000);

  scheduleVerify({ passed: true, reportUnlocked: true });
  await page.locator("button", { hasText: "Verify Impact" }).click();
  await page.waitForTimeout(2000);

  const reportTab = page.getByRole("button", { name: "Report", exact: true });
  await expect(reportTab).toBeVisible({ timeout: 3000 });

  await page.locator("button[aria-label='Session options']").click();
  await page.waitForTimeout(500);
  await page.locator("button", { hasText: "Reset session" }).click();
  await page.waitForTimeout(2000);

  await expect(reportTab).not.toBeVisible({ timeout: 3000 });
  await expect(page.getByText("Transaction Results")).not.toBeVisible({ timeout: 3000 });
  await expect(page.getByText("Evidence State")).not.toBeVisible({ timeout: 3000 });
});

// ════════════════════════════════════════════════════════
test("verify impact uses backend-only verification", async ({ page }) => {
  await seedAuth(page);
  await setupApiMocks(page);
  await navigateToExploitTab(page);

  let verifyHit = false;
  await page.route(`**/api/v1/research-labs/sessions/${SESSION_ID}/verify-objective`, async (route) => {
    verifyHit = true;
    await route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ success: true, data: { session_id: SESSION_ID, passed: false, phase: "PROVE_IMPACT", exploitVerified: false, reportUnlocked: false, userFacingEvidence: [], status: "failed", objective_progress: 1, session_status: "failed", report_status: "locked" } }) });
  });

  await page.locator("button", { hasText: "Verify Impact" }).click();
  await page.waitForTimeout(2000);
  expect(verifyHit).toBe(true);
});
