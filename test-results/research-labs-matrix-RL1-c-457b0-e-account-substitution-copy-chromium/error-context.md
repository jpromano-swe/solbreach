# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: research-labs-matrix.spec.ts >> RL1 catalog and workspace use account substitution copy
- Location: tests/e2e/research-labs-matrix.spec.ts:569:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/caller-supplied collateral accounts/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/caller-supplied collateral accounts/i)

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
  - button "Profile"
  - button "Toggle theme":
    - img
- main:
  - button "Labs"
  - paragraph: "RL1: Account Substitution"
  - text: Sandbox Ready
  - button "Session options"
  - paragraph: Scenario Briefing
  - heading "Investigate the protocol behavior." [level=1]
  - paragraph: A lending market called Breachlend is testing their borrow function implementation, but the code was written by their newest intern and needs to be double checked before deployed to production. Inspect accounts, and document any findings that can cause protocol malfunction to warn Breachlend.
  - button "Inspect"
  - button "Execute Exploit"
  - text: programs/account_substitution/src/lib.rs
  - code:
    - textbox "Editor content"
  - paragraph: Protocol State
  - paragraph: Accounts involved in the program.
  - paragraph: Investigator Wallet
  - paragraph: e2e-...wallet
  - text: Visible Owner System Program Role Transaction signer Authority Connected wallet Signer Available
  - paragraph: Protocol State
  - paragraph: PDA...state
  - text: Visible Owner Lab Program Role State account under investigation Authority Expected authority unknown Transition Unverified Evidence Pending
  - paragraph: Protocol Treasury
  - paragraph: Vault...1111
  - text: Visible Owner Lab Program Role Value-bearing account Mint Scenario-defined asset Pre-state Stable Post-state Pending
  - complementary:
    - complementary:
      - paragraph: Inspect Checkpoint
      - paragraph: Inspection Checks
      - text: Protocol source reviewed Account relationships inspected Collateral validation located Exploit path ready
      - paragraph: Unlocks Next
      - paragraph: Exploit Interface
      - paragraph: Move from source review into the protocol attack flow.
      - button "Try Exploit"
    - paragraph: Inspect Hint
    - paragraph: Hints stay hidden until you ask for them.
    - button "Show Hint"
- contentinfo:
  - paragraph:
    - text: Built for
    - img "Solana"
    - text: by ZirconDioxide.
  - link "Open SolBreach on X":
    - /url: https://x.com/solbreach_app
    - text: solbreach_app
  - link "Open SolBreach documentation":
    - /url: https://solbreach.gitbook.io/documentation
    - text: Documentation
- region "Notifications alt+T"
- alert
- alert
- alert
```

# Test source

```ts
  479 |           data: {
  480 |             accounts: [
  481 |               {
  482 |                 ref: "official_vault_account",
  483 |                 label: "Protocol USDC Vault",
  484 |                 owner: "Lab Program",
  485 |                 lamports: 1_000_000,
  486 |                 data: { liquidity: "100000 USDC" },
  487 |               },
  488 |               {
  489 |                 ref: "attacker_collateral_account",
  490 |                 label: "Injected IJC Source",
  491 |                 owner: "Attacker",
  492 |                 lamports: 500_000,
  493 |                 data: { amount: "50000 IJC" },
  494 |               },
  495 |             ],
  496 |           },
  497 |           error: null,
  498 |         }),
  499 |       });
  500 |     }
  501 | 
  502 |     return route.fulfill({ status: 404, body: "Not mocked" });
  503 |   });
  504 | }
  505 | 
  506 | function sessionPayload() {
  507 |   return {
  508 |     session_id: SESSION_ID,
  509 |     lab_id: "rl1-account-substitution",
  510 |     status: "active",
  511 |     stage: "investigate",
  512 |     expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  513 |     files: [
  514 |       {
  515 |         path: "programs/account_substitution/src/lib.rs",
  516 |         language: "rust",
  517 |         content: "#[program]\npub mod account_substitution {}\n",
  518 |         writable: true,
  519 |       },
  520 |     ],
  521 |     terminal: [],
  522 |     latest_sequence: 0,
  523 |     test_results: [],
  524 |     objective_progress: 1,
  525 |     report_status: "locked",
  526 |   };
  527 | }
  528 | 
  529 | async function openResearchLab(page: Page) {
  530 |   await page.goto("/?section=research-labs", {
  531 |     waitUntil: "networkidle",
  532 |     timeout: 30000,
  533 |   });
  534 |   await expect(page.getByText("Supported protocol investigations.")).toBeVisible();
  535 |   await page.getByRole("button", { name: /Unlock labs/i }).click();
  536 |   await expect(
  537 |     page.getByRole("heading", { name: "Account Substitution" })
  538 |   ).toBeVisible();
  539 |   await page.getByRole("button", { name: /Open lab/i }).first().click();
  540 |   await expect(page.getByRole("button", { name: "Execute Exploit" })).toBeVisible();
  541 | }
  542 | 
  543 | async function completeFindingReview(page: Page) {
  544 |   const startFindingReviewButtons = page.getByRole("button", {
  545 |     name: "Start Finding Review",
  546 |     exact: true,
  547 |   });
  548 |   await expect(startFindingReviewButtons).toHaveCount(2);
  549 |   await startFindingReviewButtons.nth(0).click();
  550 |   await page.getByLabel(/Account substitution caused by missing account binding/i).check();
  551 |   await page.getByRole("button", { name: /^Next$/i }).click();
  552 |   await page.getByLabel(/A candidate collateral account and an external vault path/i).check();
  553 |   await page.getByRole("button", { name: /^Next$/i }).click();
  554 |   await page.getByLabel(/An invalid account relationship was treated as approved collateral/i).check();
  555 |   await page.getByRole("button", { name: /^Next$/i }).click();
  556 |   await page.getByLabel(/Invalid deposit creates credit, then real treasury funds are borrowed out/i).check();
  557 |   await page.getByRole("button", { name: /^Next$/i }).click();
  558 |   await page.getByLabel(/Real protocol value left the treasury after invalid credit was used/i).check();
  559 |   await page.getByRole("button", { name: /^Next$/i }).click();
  560 |   await page.getByLabel(/Only after invalid credit enables a real treasury withdrawal/i).check();
  561 |   await page.getByRole("button", { name: /^Next$/i }).click();
  562 |   await page.getByLabel(/Transaction timeline and account state evidence together/i).check();
  563 |   await page.getByRole("button", { name: /^Next$/i }).click();
  564 |   await page.getByLabel(/Bind source and vault to approved mint and canonical vault/i).check();
  565 |   await page.getByRole("button", { name: /^Next$/i }).click();
  566 |   await page.getByRole("button", { name: /Submit Review/i }).click();
  567 | }
  568 | 
  569 | test("RL1 catalog and workspace use account substitution copy", async ({
  570 |   page,
  571 | }) => {
  572 |   await seedAuth(page);
  573 |   await setupApiMocks(page);
  574 |   await openResearchLab(page);
  575 | 
  576 |   await expect(page.getByText("Account Substitution")).toBeVisible();
  577 |   await expect(
  578 |     page.getByText(/caller-supplied collateral accounts/i)
> 579 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  580 |   await expect(
  581 |     page.getByText("Build Audit Report")
  582 |   ).not.toBeVisible();
  583 |   await expect(page.getByText("Vault Mirage")).toHaveCount(0);
  584 |   await expect(page.getByText(/arithmetic safety/i)).toHaveCount(0);
  585 | });
  586 | 
  587 | test("RL1 official deposit unlocks canonical borrow without proving exploit", async ({
  588 |   page,
  589 | }) => {
  590 |   await seedAuth(page);
  591 |   await setupApiMocks(page);
  592 |   await openResearchLab(page);
  593 | 
  594 |   pendingTransaction = {
  595 |     instructionType: "DEPOSIT_COLLATERAL",
  596 |     status: "success",
  597 |     logs: ["Canonical deposit executed"],
  598 |   };
  599 | 
  600 |   await page.getByRole("button", { name: "Execute Exploit" }).click();
  601 |   await page.getByLabel("Token").selectOption("official_collateral_account");
  602 |   await page.getByLabel("Vault").selectOption("official_vault_account");
  603 |   await page.getByRole("button", { name: "Deposit", exact: true }).click();
  604 | 
  605 |   await expect(
  606 |     page.getByText("Regular deposit executed · Pool liquidity increased")
  607 |   ).toBeVisible();
  608 | 
  609 |   await page.getByRole("button", { name: "Max", exact: true }).click();
  610 |   await expect(page.getByLabel("Borrow Amount")).toHaveValue("40,000");
  611 |   await expect(page.getByRole("button", { name: /^Borrow$/i })).toBeEnabled();
  612 | });
  613 | 
  614 | test("RL1 verify flow unlocks deterministic report builder", async ({
  615 |   page,
  616 | }) => {
  617 |   await seedAuth(page);
  618 |   await setupApiMocks(page);
  619 |   await openResearchLab(page);
  620 | 
  621 |   pendingTransaction = {
  622 |     instructionType: "DEPOSIT_COLLATERAL",
  623 |     status: "success",
  624 |     logs: ["Deposit executed"],
  625 |   };
  626 | 
  627 |   await page.getByRole("button", { name: "Execute Exploit" }).click();
  628 |   await page.getByLabel("Token").selectOption("attacker_collateral_account");
  629 |   await page.getByLabel("Vault").selectOption("counterfeit_vault_account");
  630 |   await page.getByRole("button", { name: "Deposit", exact: true }).click();
  631 |   await page.getByRole("button", { name: "Max", exact: true }).click();
  632 |   await expect(page.getByLabel("Borrow Amount")).toHaveValue("40,000");
  633 | 
  634 |   pendingTransaction = {
  635 |     instructionType: "WITHDRAW_AGAINST_CREDIT",
  636 |     status: "success",
  637 |     logs: ["Borrow executed"],
  638 |   };
  639 | 
  640 |   await page.getByRole("button", { name: /Borrow/i }).click();
  641 |   await page.getByRole("button", { name: /Review Evidence/i }).click();
  642 | 
  643 |   pendingVerify = {
  644 |     passed: true,
  645 |     reportUnlocked: true,
  646 |     verifiedEvidenceRefs: ["deposit_tx", "borrow_tx"],
  647 |   };
  648 | 
  649 |   await page.getByRole("button", { name: "Verify Impact" }).click();
  650 |   await page.getByRole("button", { name: /Continue to Submit Finding/i }).click();
  651 |   await completeFindingReview(page);
  652 |   const buildAuditReportButtons = page.getByRole("button", {
  653 |     name: "Build Audit Report",
  654 |     exact: true,
  655 |   });
  656 |   await expect(buildAuditReportButtons).toHaveCount(2);
  657 |   await buildAuditReportButtons.nth(0).click();
  658 | 
  659 |   await expect(
  660 |     page.getByRole("heading", { name: "Build Audit Report" })
  661 |   ).toBeVisible();
  662 |   await expect(
  663 |     page.getByText("Missing Constraints Allow Counterfeit Credit")
  664 |   ).toBeVisible();
  665 |   await expect(
  666 |     page.getByText("Bind accounts to approved config")
  667 |   ).toBeVisible();
  668 |   await expect(page.getByText("Vault Mirage")).toHaveCount(0);
  669 |   await expect(page.getByText(/vault health calculation/i)).toHaveCount(0);
  670 | });
  671 | 
```