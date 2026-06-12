# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: research-labs-matrix.spec.ts >> RL1 catalog and workspace use account substitution copy
- Location: tests/e2e/research-labs-matrix.spec.ts:494:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /RL-001/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /RL-001/i })

```

```yaml
- banner:
  - button "Open SolBreach landing page":
    - img "SolBreach"
  - navigation "Course sections":
    - button "Vulnerabilities"
    - button "Research Labs"
    - button "Breach Rooms" [disabled]
    - paragraph: Application Level
    - button "The Illusionist Unchecked account validation and forged deposits"
    - button "Identity Thief Static PDA seeds and shared profile authority"
    - button "Trojan Horse Arbitrary CPI and delegated signer abuse"
    - paragraph: Supply Chain
    - button "Dependency Takeover Malicious packages in build and deploy paths"
    - button "CI Secret Exposure Leaked keys, tokens, and release credentials"
    - button "Build Integrity Reproducible artifacts and trusted signers"
    - paragraph: Client and Wallet Side
    - button "Transaction Spoofing Misleading prompts and unsafe message construction"
    - button "Approval Drains Persistent permissions and hidden token movement"
    - button "Frontend Injection Compromised clients that rewrite wallet intent"
  - button "devnet"
  - button "9xQe...w4Xt"
  - button "My Profile"
  - button "Toggle theme":
    - img
- main:
  - heading "Supported protocol investigations." [level=1]
  - paragraph: Inspect a focused Solana protocol scenario, prove impact inside an isolated sandbox, and submit a structured finding report.
  - heading "Unlock Research Labs." [level=2]
  - paragraph: Labs unlock from wallet-bound badges and sandbox access is tied to the connected wallet.
  - button "Unlock labs"
- contentinfo:
  - paragraph: Build for Solana by ZirconDioxide.
  - link "Open SolBreach on X":
    - /url: https://x.com/solbreach_app
    - text: Twitter
  - link "Open SolBreach GitHub repository":
    - /url: https://github.com/jpromano-swe/solbreach
    - text: GitHub
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  389 |       });
  390 |     }
  391 | 
  392 |     if (url.includes("/terminal")) {
  393 |       return route.fulfill({
  394 |         status: 200,
  395 |         contentType: "application/json",
  396 |         body: JSON.stringify({
  397 |           success: true,
  398 |           data: { events: [], latest_sequence: 0 },
  399 |           error: null,
  400 |         }),
  401 |       });
  402 |     }
  403 | 
  404 |     if (url.includes("/transactions") && method === "POST") {
  405 |       const tx =
  406 |         pendingTransaction ?? {
  407 |           instructionType: "DEPOSIT_COLLATERAL" as const,
  408 |           status: "success" as const,
  409 |           logs: ["Mock sandbox success"],
  410 |         };
  411 |       return route.fulfill({
  412 |         status: 200,
  413 |         contentType: "application/json",
  414 |         body: JSON.stringify({
  415 |           success: true,
  416 |           data: {
  417 |             transaction_ref: `mock-${tx.instructionType.toLowerCase()}`,
  418 |             instruction_type: tx.instructionType,
  419 |             execution_status: tx.status,
  420 |             logs: tx.logs,
  421 |           },
  422 |           error: null,
  423 |         }),
  424 |       });
  425 |     }
  426 | 
  427 |     if (url.includes("/accounts")) {
  428 |       return route.fulfill({
  429 |         status: 200,
  430 |         contentType: "application/json",
  431 |         body: JSON.stringify({
  432 |           success: true,
  433 |           data: {
  434 |             accounts: [
  435 |               {
  436 |                 ref: "official_vault_account",
  437 |                 label: "Protocol USDC Vault",
  438 |                 owner: "Lab Program",
  439 |                 lamports: 1_000_000,
  440 |                 data: { liquidity: "100000 USDC" },
  441 |               },
  442 |               {
  443 |                 ref: "attacker_collateral_account",
  444 |                 label: "Injected IJC Source",
  445 |                 owner: "Attacker",
  446 |                 lamports: 500_000,
  447 |                 data: { amount: "50000 IJC" },
  448 |               },
  449 |             ],
  450 |           },
  451 |           error: null,
  452 |         }),
  453 |       });
  454 |     }
  455 | 
  456 |     return route.fulfill({ status: 404, body: "Not mocked" });
  457 |   });
  458 | }
  459 | 
  460 | function sessionPayload() {
  461 |   return {
  462 |     session_id: SESSION_ID,
  463 |     lab_id: "rl-001",
  464 |     status: "active",
  465 |     stage: "investigate",
  466 |     expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  467 |     files: [
  468 |       {
  469 |         path: "programs/account_substitution/src/lib.rs",
  470 |         language: "rust",
  471 |         content: "#[program]\npub mod account_substitution {}\n",
  472 |         writable: true,
  473 |       },
  474 |     ],
  475 |     terminal: [],
  476 |     latest_sequence: 0,
  477 |     test_results: [],
  478 |     objective_progress: 1,
  479 |     report_status: "locked",
  480 |   };
  481 | }
  482 | 
  483 | async function openResearchLab(page: Page) {
  484 |   await page.goto("/?section=research-labs", {
  485 |     waitUntil: "networkidle",
  486 |     timeout: 30000,
  487 |   });
  488 |   await expect(page.getByText("Supported protocol investigations.")).toBeVisible();
> 489 |   await expect(page.getByRole("button", { name: /RL-001/i })).toBeVisible();
      |                                                               ^ Error: expect(locator).toBeVisible() failed
  490 |   await page.getByRole("button", { name: /RL-001/i }).click();
  491 |   await expect(page.getByRole("button", { name: "Execute Exploit" })).toBeVisible();
  492 | }
  493 | 
  494 | test("RL1 catalog and workspace use account substitution copy", async ({
  495 |   page,
  496 | }) => {
  497 |   await seedAuth(page);
  498 |   await setupApiMocks(page);
  499 |   await openResearchLab(page);
  500 | 
  501 |   await expect(page.getByText("Account Substitution")).toBeVisible();
  502 |   await expect(
  503 |     page.getByText(/caller-supplied collateral accounts/i)
  504 |   ).toBeVisible();
  505 |   await expect(
  506 |     page.getByText("Build Audit Report")
  507 |   ).not.toBeVisible();
  508 |   await expect(page.getByText("Vault Mirage")).toHaveCount(0);
  509 |   await expect(page.getByText(/arithmetic safety/i)).toHaveCount(0);
  510 | });
  511 | 
  512 | test("RL1 verify flow unlocks deterministic report builder", async ({
  513 |   page,
  514 | }) => {
  515 |   await seedAuth(page);
  516 |   await setupApiMocks(page);
  517 |   await openResearchLab(page);
  518 | 
  519 |   pendingTransaction = {
  520 |     instructionType: "DEPOSIT_COLLATERAL",
  521 |     status: "success",
  522 |     logs: ["Deposit executed"],
  523 |   };
  524 | 
  525 |   await page.getByRole("button", { name: "Execute Exploit" }).click();
  526 |   await page.getByLabel("Token").selectOption("attacker_collateral_account");
  527 |   await page.getByLabel("Vault").selectOption("counterfeit_vault_account");
  528 |   await page.getByRole("button", { name: "Deposit" }).click();
  529 | 
  530 |   pendingTransaction = {
  531 |     instructionType: "WITHDRAW_AGAINST_CREDIT",
  532 |     status: "success",
  533 |     logs: ["Borrow executed"],
  534 |   };
  535 | 
  536 |   await page.getByRole("button", { name: /Borrow/i }).click();
  537 |   await page.getByRole("button", { name: /Review Evidence/i }).click();
  538 | 
  539 |   pendingVerify = {
  540 |     passed: true,
  541 |     reportUnlocked: true,
  542 |     verifiedEvidenceRefs: ["deposit_tx", "borrow_tx"],
  543 |   };
  544 | 
  545 |   await page.getByRole("button", { name: "Verify Impact" }).click();
  546 |   await page.getByRole("button", { name: /Continue to Submit Finding/i }).click();
  547 |   await page.getByRole("button", { name: /Build Audit Report/i }).click();
  548 | 
  549 |   await expect(
  550 |     page.getByRole("heading", { name: "Build Audit Report" })
  551 |   ).toBeVisible();
  552 |   await expect(
  553 |     page.getByText("Missing Constraints Allow Counterfeit Credit")
  554 |   ).toBeVisible();
  555 |   await expect(
  556 |     page.getByText("Bind accounts to approved config")
  557 |   ).toBeVisible();
  558 |   await expect(page.getByText("Vault Mirage")).toHaveCount(0);
  559 |   await expect(page.getByText(/vault health calculation/i)).toHaveCount(0);
  560 | });
  561 | 
```