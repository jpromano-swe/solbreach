# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: research-labs-matrix.spec.ts >> RL1 verify flow unlocks deterministic report builder
- Location: tests/e2e/research-labs-matrix.spec.ts:614:5

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Continue to Submit Finding/i })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - button "Open SolBreach landing page" [ref=e7]:
          - img "SolBreach" [ref=e8]
        - navigation "Course sections" [ref=e9]:
          - button "Vulnerabilities" [ref=e10]:
            - text: Vulnerabilities
            - img [ref=e11]
          - button "Research Labs" [ref=e13]
          - button "Breach Rooms" [disabled] [ref=e14]:
            - img [ref=e15]
            - text: Breach Rooms
          - generic:
            - generic:
              - generic:
                - generic:
                  - paragraph: Application Level
                  - generic:
                    - button "The Illusionist Unchecked account validation and forged deposits":
                      - generic:
                        - img
                      - generic:
                        - generic: The Illusionist
                        - generic: Unchecked account validation and forged deposits
                    - button "Identity Thief Static PDA seeds and shared profile authority":
                      - generic:
                        - img
                      - generic:
                        - generic: Identity Thief
                        - generic: Static PDA seeds and shared profile authority
                    - button "Trojan Horse Arbitrary CPI and delegated signer abuse":
                      - generic:
                        - img
                      - generic:
                        - generic: Trojan Horse
                        - generic: Arbitrary CPI and delegated signer abuse
                - generic:
                  - paragraph: Supply Chain
                  - generic:
                    - button "Dependency Takeover Malicious packages in build and deploy paths":
                      - generic:
                        - img
                      - generic:
                        - generic: Dependency Takeover
                        - generic: Malicious packages in build and deploy paths
                    - button "CI Secret Exposure Leaked keys, tokens, and release credentials":
                      - generic:
                        - img
                      - generic:
                        - generic: CI Secret Exposure
                        - generic: Leaked keys, tokens, and release credentials
                    - button "Build Integrity Reproducible artifacts and trusted signers":
                      - generic:
                        - img
                      - generic:
                        - generic: Build Integrity
                        - generic: Reproducible artifacts and trusted signers
                - generic:
                  - paragraph: Client and Wallet Side
                  - generic:
                    - button "Transaction Spoofing Misleading prompts and unsafe message construction":
                      - generic:
                        - img
                      - generic:
                        - generic: Transaction Spoofing
                        - generic: Misleading prompts and unsafe message construction
                    - button "Approval Drains Persistent permissions and hidden token movement":
                      - generic:
                        - img
                      - generic:
                        - generic: Approval Drains
                        - generic: Persistent permissions and hidden token movement
                    - button "Frontend Injection Compromised clients that rewrite wallet intent":
                      - generic:
                        - img
                      - generic:
                        - generic: Frontend Injection
                        - generic: Compromised clients that rewrite wallet intent
        - generic [ref=e19]:
          - button "devnet" [ref=e21] [cursor=pointer]: devnet
          - button "9xQe...w4Xt" [ref=e24] [cursor=pointer]:
            - generic [ref=e26]: 9xQe...w4Xt
            - img [ref=e27]
          - button "Profile" [ref=e29]
          - button "Toggle theme" [ref=e30] [cursor=pointer]:
            - img [ref=e31]
    - main [ref=e37]:
      - generic [ref=e39]:
        - generic [ref=e40]:
          - generic [ref=e41]:
            - button "Labs" [ref=e42]:
              - img [ref=e43]
              - text: Labs
            - paragraph [ref=e47]: "RL1: Account Substitution"
          - generic [ref=e48]:
            - generic [ref=e49]: Sandbox Ready
            - button "Session options" [ref=e52]:
              - img [ref=e53]
        - generic [ref=e59]:
          - paragraph [ref=e60]: Scenario Briefing
          - heading "Investigate the protocol behavior." [level=1] [ref=e61]
          - paragraph [ref=e62]: A lending market called Breachlend is testing their borrow function implementation, but the code was written by their newest intern and needs to be double checked before deployed to production. Inspect accounts, and document any findings that can cause protocol malfunction to warn Breachlend.
        - generic [ref=e63]:
          - generic [ref=e64]:
            - generic [ref=e66]:
              - button "Inspect" [ref=e67]:
                - img [ref=e68]
                - text: Inspect
              - button "Execute Exploit" [ref=e72]:
                - img [ref=e73]
                - text: Execute Exploit
              - button "Report Finding" [ref=e75]:
                - img [ref=e76]
                - text: Report Finding
            - generic [ref=e83]:
              - generic [ref=e85]:
                - button "Exploit Hypothesis" [ref=e86]
                - button "Evidence Review" [ref=e87]
              - generic [ref=e91]:
                - heading "Prove what changed." [level=2] [ref=e92]
                - paragraph [ref=e93]: Review transaction execution, account deltas, and runtime logs before verifying impact.
                - generic [ref=e94]:
                  - generic [ref=e96]:
                    - paragraph [ref=e97]: Transaction Timeline
                    - generic [ref=e98]:
                      - generic [ref=e100]:
                        - generic [ref=e101]:
                          - paragraph [ref=e102]: Deposit executed · Position credit changed
                          - generic [ref=e103]:
                            - generic [ref=e104]: "Amount: 50,000"
                            - generic [ref=e105]: Injected IJC Source -> Attacker-Controlled Vault
                        - button "Expand transaction logs" [ref=e106]:
                          - img [ref=e107]
                      - generic [ref=e110]:
                        - generic [ref=e111]:
                          - paragraph [ref=e112]: Borrow action executed · Treasury balance changed
                          - generic [ref=e114]: "Amount: 40,000"
                        - button "Expand transaction logs" [ref=e115]:
                          - img [ref=e116]
                  - generic [ref=e118]:
                    - generic [ref=e119]:
                      - paragraph [ref=e120]: Account State Deltas
                      - generic [ref=e121]:
                        - generic [ref=e122]:
                          - generic [ref=e123]:
                            - generic [ref=e124]: Illegitimate Credit
                            - generic [ref=e125]: Changed
                          - generic [ref=e126]:
                            - generic [ref=e127]:
                              - paragraph [ref=e128]: Initial Balance
                              - paragraph [ref=e129]: "0"
                            - img [ref=e132]
                            - generic [ref=e134]:
                              - paragraph [ref=e135]: Current Balance
                              - paragraph [ref=e136]: 50,000
                        - generic [ref=e137]:
                          - generic [ref=e138]:
                            - generic [ref=e139]: Treasury Balance
                            - generic [ref=e140]: Changed
                          - generic [ref=e141]:
                            - generic [ref=e142]:
                              - paragraph [ref=e143]: Initial Balance
                              - paragraph [ref=e144]: 100.00k USDC
                            - img [ref=e147]
                            - generic [ref=e149]:
                              - paragraph [ref=e150]: Current Balance
                              - paragraph [ref=e151]: 60.00k USDC
                    - button "Impact verified" [disabled] [ref=e153]
          - complementary [ref=e154]:
            - generic [ref=e156]:
              - generic [ref=e157]:
                - img [ref=e158]
                - paragraph [ref=e161]: Exploit Checkpoint
              - generic [ref=e162]:
                - paragraph [ref=e163]: Exploit Progress
                - generic [ref=e164]:
                  - generic [ref=e165]:
                    - img [ref=e167]
                    - generic [ref=e169]: Hypothesis selected
                  - generic [ref=e170]:
                    - img [ref=e172]
                    - generic [ref=e174]: Non-canonical credit route created
                  - generic [ref=e175]:
                    - img [ref=e177]
                    - generic [ref=e179]: Borrow executed against observed credit
                  - generic [ref=e180]:
                    - img [ref=e182]
                    - generic [ref=e184]: Impact verified
                  - generic [ref=e185]:
                    - img [ref=e187]
                    - generic [ref=e189]: Report unlocked
              - generic [ref=e190]:
                - paragraph [ref=e191]: Unlocks Next
                - generic [ref=e192]:
                  - img [ref=e194]
                  - generic [ref=e198]:
                    - paragraph [ref=e199]: Report Finding
                    - paragraph [ref=e200]: Answer the questions and prepare your first Finding Report
                - button "Fill Report" [ref=e201]
    - contentinfo [ref=e202]:
      - generic [ref=e203]:
        - paragraph [ref=e204]:
          - generic [ref=e205]: Built for
          - img "Solana" [ref=e206]
          - generic [ref=e207]: by ZirconDioxide.
        - generic [ref=e208]:
          - link "Open SolBreach on X" [ref=e209] [cursor=pointer]:
            - /url: https://x.com/solbreach_app
            - img [ref=e210]
            - generic [ref=e212]: solbreach_app
          - link "Open SolBreach documentation" [ref=e213] [cursor=pointer]:
            - /url: https://solbreach.gitbook.io/documentation
            - img [ref=e214]
            - generic [ref=e216]: Documentation
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e222] [cursor=pointer]:
    - img [ref=e223]
  - alert [ref=e226]
```

# Test source

```ts
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
  579 |   ).toBeVisible();
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
> 650 |   await page.getByRole("button", { name: /Continue to Submit Finding/i }).click();
      |                                                                           ^ Error: locator.click: Test timeout of 120000ms exceeded.
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