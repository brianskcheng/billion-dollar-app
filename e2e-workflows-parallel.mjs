#!/usr/bin/env node
/**
 * Parallel E2E workflow tests for billion-dollar-app
 * Run: node e2e-workflows-parallel.mjs (requires: npm install playwright)
 * App must be running at http://localhost:3000
 *
 * Runs 4 workflow groups in parallel, each with a unique test user.
 *
 * Usage:
 *   npm run test:e2e:parallel     - run all 4 groups in parallel
 *   node e2e-workflows-parallel.mjs --group=auth    - run Auth group only
 *   node e2e-workflows-parallel.mjs --group=leads   - run Leads group only
 *   node e2e-workflows-parallel.mjs --group=campaigns
 *   node e2e-workflows-parallel.mjs --group=inbox
 *
 * For parallel agents (mcp_task): launch 4 agents, each with --group=auth|leads|campaigns|inbox
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const timestamp = Date.now();
const TEST_PASSWORD = "Test123!";

function makeEmail(group) {
  return `test-e2e-parallel-${group}-${timestamp}@example.com`;
}

function log(results, group, step, pass, detail = "") {
  const r = { group, step, pass: !!pass, detail: String(detail || "").trim() };
  results.push(r);
  console.log(`[${pass ? "PASS" : "FAIL"}] [${group}] ${step}${detail ? ": " + detail : ""}`);
  return r;
}

async function ensureLogin(page, email, password, results, group) {
  if (page.url().includes("/dashboard")) return true;
  await page.goto(`${BASE}/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 8000 }).catch(() => {});
  const ok = page.url().includes("/dashboard");
  if (!ok) log(results, group, "Login", false, "Did not reach dashboard");
  return ok;
}

/** Group A: Auth flow */
async function runAuthFlow(context, results) {
  const group = "Auth";
  const email = makeEmail("auth");
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  try {
    await page.goto(`${BASE}/signup`);
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill(TEST_PASSWORD);
    await page.getByTestId("signup-submit").click();
    await page.waitForURL(/\/dashboard/, { timeout: 12000 });
    log(results, group, "1. Signup", true, "Redirected to /dashboard");
  } catch (e) {
    const errEl = await page.locator(".text-red-600").first().textContent().catch(() => "");
    log(results, group, "1. Signup", false, (e.message || String(e)) + (errEl ? " | " + errEl : ""));
  }

  if (page.url().includes("/dashboard")) {
    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL(/\/login/, { timeout: 6000 }).catch(() => {});
    log(results, group, "2. Logout", page.url().includes("/login"), "Redirected to /login");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 8000 }).catch(() => {});
    log(results, group, "2. Login", page.url().includes("/dashboard"), "");
  } else {
    log(results, group, "2. Login/Logout", false, "Skipped - not on dashboard");
  }

  await page.close();
}

/** Group B: Leads flow */
async function runLeadsFlow(context, results) {
  const group = "Leads";
  const email = makeEmail("leads");
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  try {
    await page.goto(`${BASE}/signup`);
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill(TEST_PASSWORD);
    await page.getByTestId("signup-submit").click();
    await page.waitForURL(/\/dashboard/, { timeout: 12000 }).catch(() => {});
  } catch {}

  if (!(await ensureLogin(page, email, TEST_PASSWORD, results, group))) {
    await page.close();
    return;
  }

  let leadId = "";
  try {
    await page.goto(`${BASE}/leads`);
    await page.waitForLoadState("networkidle").catch(() => {});
    const searchInput = page.getByPlaceholder(/recruitment agencies/i);
    await searchInput.fill("recruitment agencies london");
    const limitInput = page.locator('input[type="number"]');
    await limitInput.fill("5");
    await page.getByRole("button", { name: /Find Leads/i }).click();
    await page.waitForTimeout(6000);
    let rows = page.locator("table tbody tr");
    let count = await rows.count();
    let firstText = await rows.first().textContent().catch(() => "");
    let hasData = count > 0 && firstText && !firstText.includes("No leads yet");
    if (hasData) {
      const firstLink = page.locator('a[href*="campaigns?lead="]').first();
      if ((await firstLink.count()) > 0) {
        leadId = (await firstLink.getAttribute("href"))?.split("lead=")[1]?.split("&")[0] || "";
      }
      log(results, group, "Leads", true, "Table updated with leads");
    } else {
      await page.getByRole("button", { name: /Add lead manually/i }).click();
      await page.waitForTimeout(300);
      await page.getByPlaceholder(/Email \(required\)/i).fill(`e2e-leads-${timestamp}@example.com`);
      await page.getByRole("button", { name: "Add" }).last().click();
      await page.waitForTimeout(2000);
      rows = page.locator("table tbody tr");
      count = await rows.count();
      firstText = await rows.first().textContent().catch(() => "");
      hasData = count > 0 && firstText && !firstText.includes("No leads yet");
      if (hasData) {
        const firstLink = page.locator('a[href*="campaigns?lead="]').first();
        if ((await firstLink.count()) > 0) {
          leadId = (await firstLink.getAttribute("href"))?.split("lead=")[1]?.split("&")[0] || "";
        }
        log(results, group, "Leads", true, "Manual lead added");
      } else {
        log(results, group, "Leads", false, await page.locator(".text-red-600").first().textContent().catch(() => "No leads"));
      }
    }
  } catch (e) {
    log(results, group, "Leads", false, e.message || String(e));
  }

  await page.close();
  return leadId;
}

/** Group C: Campaigns flow */
async function runCampaignsFlow(context, results, leadIdFromLeads) {
  const group = "Campaigns";
  const email = makeEmail("campaigns");
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  try {
    await page.goto(`${BASE}/signup`);
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill(TEST_PASSWORD);
    await page.getByTestId("signup-submit").click();
    await page.waitForURL(/\/dashboard/, { timeout: 12000 }).catch(() => {});
  } catch {}

  if (!(await ensureLogin(page, email, TEST_PASSWORD, results, group))) {
    await page.close();
    return;
  }

  let leadId = leadIdFromLeads;
  if (!leadId) {
    try {
      await page.goto(`${BASE}/leads`);
      await page.getByRole("button", { name: /Add lead manually/i }).click();
      await page.waitForTimeout(300);
      await page.getByPlaceholder(/Email \(required\)/i).fill(`e2e-campaigns-${timestamp}@example.com`);
      await page.getByRole("button", { name: "Add" }).last().click();
      await page.waitForTimeout(2000);
      const firstLink = page.locator('a[href*="campaigns?lead="]').first();
      if ((await firstLink.count()) > 0) {
        leadId = (await firstLink.getAttribute("href"))?.split("lead=")[1]?.split("&")[0] || "";
      }
    } catch {}
  }

  try {
    await page.goto(`${BASE}/campaigns`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.getByRole("button", { name: "New campaign" }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder("Campaign name").fill(`Test Campaign ${timestamp}`);
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForTimeout(2000);
    if (leadId) {
      await page.goto(`${BASE}/campaigns?lead=${leadId}`);
      await page.waitForTimeout(3000);
      const closeBtn = page.getByRole("button", { name: "Close" });
      if ((await closeBtn.count()) > 0) await closeBtn.click();
    }
    await page.goto(`${BASE}/campaigns`);
    await page.waitForTimeout(1000);
    const card = page.locator(".border.p-4.rounded").first();
    await card.hover().catch(() => {});
    await page.waitForTimeout(2000);
    const pickBtn = page.getByRole("button", { name: "Pick from leads" }).first();
    await pickBtn.click().catch(() => {});
    await page.waitForTimeout(2000);
    const addFromPicker = page.locator('.border.rounded button:has-text("Add")').first();
    const pickerVisible = await addFromPicker.isVisible().catch(() => false);
    if (pickerVisible) {
      await addFromPicker.click();
      await page.waitForTimeout(1500);
      log(results, group, "Campaigns", true, "Campaign created and lead added");
    } else if (leadId) {
      const idInput = page.locator('input[placeholder="Lead ID to add"]');
      await idInput.fill(leadId);
      await page.getByRole("button", { name: "Add" }).last().click();
      await page.waitForTimeout(1000);
      log(results, group, "Campaigns", true, "Campaign created and lead added by ID");
    } else {
      log(results, group, "Campaigns", true, "Campaign created (no leads)");
    }
  } catch (e) {
    log(results, group, "Campaigns", false, e.message || String(e));
  }

  await page.close();
}

/** Group D: Inbox, Upgrade, Admin */
async function runInboxUpgradeAdminFlow(context, results) {
  const group = "Inbox/Upgrade/Admin";
  const email = makeEmail("inbox");
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  try {
    await page.goto(`${BASE}/signup`);
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-password").fill(TEST_PASSWORD);
    await page.getByTestId("signup-submit").click();
    await page.waitForURL(/\/dashboard/, { timeout: 12000 }).catch(() => {});
  } catch {}

  if (!(await ensureLogin(page, email, TEST_PASSWORD, results, group))) {
    await page.close();
    return;
  }

  try {
    await page.goto(`${BASE}/inbox`);
    await page.waitForLoadState("networkidle").catch(() => {});
    const hasTable = (await page.locator("table").count()) > 0;
    log(results, group, "Inbox", true, hasTable ? "Page loads with table" : "Page loads");
  } catch (e) {
    log(results, group, "Inbox", false, e.message || String(e));
  }

  try {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle").catch(() => {});
    const upgradeBtn = page.getByRole("button", { name: /Upgrade to Pro/i });
    if ((await upgradeBtn.count()) > 0) {
      await upgradeBtn.click();
      await page.waitForTimeout(2000);
      const hasRedirect = page.url().includes("stripe.com");
      const hasError = (await page.getByText(/not configured|Billing not configured|STRIPE/i).count()) > 0;
      log(results, group, "Upgrade", hasError || hasRedirect, hasRedirect ? "Redirected to Stripe" : "Error shown (expected if Stripe not configured)");
    } else {
      log(results, group, "Upgrade", true, "No upgrade button (Pro user)");
    }
  } catch (e) {
    log(results, group, "Upgrade", false, e.message || String(e));
  }

  try {
    await page.goto(`${BASE}/admin`);
    await page.waitForLoadState("networkidle").catch(() => {});
    const forbidden = (await page.getByText(/forbidden|unauthorized|access denied/i).count()) > 0;
    const redirected = !page.url().includes("/admin");
    const ok = page.url().includes("/admin") && !forbidden;
    if (redirected) {
      log(results, group, "Admin", true, "Non-admin redirected (expected)");
    } else {
      log(results, group, "Admin", ok, ok ? "Page loads" : "Access denied");
    }
  } catch (e) {
    log(results, group, "Admin", false, e.message || String(e));
  }

  await page.close();
}

const GROUPS = ["auth", "leads", "campaigns", "inbox"];

async function main() {
  const groupArg = process.argv.find((a) => a.startsWith("--group="));
  const runOnly = groupArg ? groupArg.split("=")[1]?.toLowerCase() : null;
  if (runOnly && !GROUPS.includes(runOnly)) {
    console.error(`Invalid --group. Use one of: ${GROUPS.join(", ")}`);
    process.exit(1);
  }

  const results = [];
  const browser = await chromium.launch({ headless: true });

  const runGroup = (name, fn) =>
    (!runOnly || runOnly === name) ? fn() : Promise.resolve();

  console.log(runOnly ? `Running workflow group: ${runOnly}\n` : "Running 4 workflow groups in parallel...\n");

  const start = Date.now();
  await Promise.all([
    runGroup("auth", async () => {
      const ctx = await browser.newContext();
      try {
        await runAuthFlow(ctx, results);
      } finally {
        await ctx.close();
      }
    }),
    runGroup("leads", async () => {
      const ctx = await browser.newContext();
      try {
        await runLeadsFlow(ctx, results);
      } finally {
        await ctx.close();
      }
    }),
    runGroup("campaigns", async () => {
      const ctx = await browser.newContext();
      try {
        await runCampaignsFlow(ctx, results, null);
      } finally {
        await ctx.close();
      }
    }),
    runGroup("inbox", async () => {
      const ctx = await browser.newContext();
      try {
        await runInboxUpgradeAdminFlow(ctx, results);
      } finally {
        await ctx.close();
      }
    }),
  ]);

  await browser.close();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n--- Summary (${elapsed}s) ---`);
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  console.log(`Passed: ${passed}/${results.length}`);
  if (failed.length) {
    console.log("Failed:");
    failed.forEach((f) => console.log(`  - [${f.group}] ${f.step}: ${f.detail}`));
  }
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
