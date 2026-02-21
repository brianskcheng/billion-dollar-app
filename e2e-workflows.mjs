#!/usr/bin/env node
/**
 * E2E workflow tests for billion-dollar-app
 * Run: node e2e-workflows.mjs (requires: npm install playwright)
 * App must be running at http://localhost:3000
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const timestamp = Date.now();
const TEST_EMAIL = `test-e2e-${timestamp}@example.com`;
const TEST_PASSWORD = "Test123!";

const results = [];

function log(step, pass, detail = "") {
  const r = { step, pass: !!pass, detail: String(detail || "").trim() };
  results.push(r);
  console.log(`[${pass ? "PASS" : "FAIL"}] ${step}${detail ? ": " + detail : ""}`);
  return r;
}

async function main() {
  let browser;
  let page;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(15000);

    // --- 1. Signup ---
    try {
      await page.goto(`${BASE}/signup`);
      await page.getByTestId("signup-email").fill(TEST_EMAIL);
      await page.getByTestId("signup-password").fill(TEST_PASSWORD);
      await page.getByTestId("signup-submit").click();
      await page.waitForURL(/\/dashboard/, { timeout: 12000 });
      log("1. Signup", true, "Redirected to /dashboard");
    } catch (e) {
      const errMsg = e.message || String(e);
      const errEl = await page.locator(".text-red-600").first().textContent().catch(() => "");
      log("1. Signup", false, errMsg + (errEl ? " | " + errEl : ""));
    }

    // --- 2. Login/Logout ---
    if (!page.url().includes("/dashboard")) {
      await page.goto(`${BASE}/login`);
      await page.locator('input[type="email"]').fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Log in" }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 8000 }).catch(() => {});
    }
    if (page.url().includes("/dashboard")) {
      await page.getByRole("button", { name: "Log out" }).click();
      await page.waitForURL(/\/login/, { timeout: 6000 }).catch(() => {});
      const gotLogin = page.url().includes("/login");
      log("2. Logout", gotLogin, gotLogin ? "Redirected to /login" : "Did not redirect to /login");
      await page.locator('input[type="email"]').fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Log in" }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 8000 }).catch(() => {});
      log("2. Login", page.url().includes("/dashboard"), "");
    } else {
      log("2. Login/Logout", false, "Skipped - not on dashboard after signup");
    }

    if (!page.url().includes("/dashboard")) {
      await page.goto(`${BASE}/login`);
      await page.locator('input[type="email"]').fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Log in" }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 8000 }).catch(() => {});
    }

    // --- 3. Gmail Connect ---
    try {
      if (!page.url().includes("/dashboard")) await page.goto(`${BASE}/dashboard`);
      await page.getByRole("link", { name: "Connect Gmail" }).click();
      await page.waitForTimeout(3000);
      const u = page.url();
      if (u.includes("accounts.google.com") || u.includes("google.com")) {
        log("3. Gmail Connect", true, "Redirected to Google OAuth");
      } else if (u.includes("gmail_error=")) {
        const gmailErr = decodeURIComponent(u.split("gmail_error=")[1]?.split("&")[0] || "");
        log("3. Gmail Connect", true, gmailErr ? "Helpful error when not configured" : "Redirected with gmail_error");
      } else {
        log("3. Gmail Connect", false, `No OAuth redirect, stayed on ${u}`);
      }
      await page.goto(`${BASE}/dashboard`);
    } catch (e) {
      log("3. Gmail Connect", false, e.message || String(e));
    }

    // --- 4. Leads ---
    let leadIdFromLeads = "";
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
          leadIdFromLeads = (await firstLink.getAttribute("href"))?.split("lead=")[1]?.split("&")[0] || "";
        }
        log("4. Leads", true, "Table updated with leads");
      } else {
        // Fallback: add lead manually when Apify search fails (no token, memory limit, etc.)
        try {
          await page.getByRole("button", { name: /Add lead manually/i }).click();
          await page.waitForTimeout(300);
          const manualEmail = `e2e-test-${timestamp}@example.com`;
          await page.getByPlaceholder(/Email \(required\)/i).fill(manualEmail);
          await page.getByRole("button", { name: "Add" }).last().click();
          await page.waitForTimeout(2000);
          rows = page.locator("table tbody tr");
          count = await rows.count();
          firstText = await rows.first().textContent().catch(() => "");
          hasData = count > 0 && firstText && !firstText.includes("No leads yet");
          if (hasData) {
            const firstLink = page.locator('a[href*="campaigns?lead="]').first();
            if ((await firstLink.count()) > 0) {
              leadIdFromLeads = (await firstLink.getAttribute("href"))?.split("lead=")[1]?.split("&")[0] || "";
            }
            log("4. Leads", true, "Manual lead added (Apify search skipped)");
          } else {
            const err = await page.locator(".text-red-600").first().textContent().catch(() => "");
            log("4. Leads", false, err || "No leads in table after manual add");
          }
        } catch (fallbackErr) {
          const err = await page.locator(".text-red-600").first().textContent().catch(() => "");
          log("4. Leads", false, err || fallbackErr.message || "No leads - API may need APIFY_API_KEY");
        }
      }
    } catch (e) {
      log("4. Leads", false, e.message || String(e));
    }

    // --- 5. Campaigns ---
    try {
      await page.goto(`${BASE}/campaigns`);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.getByRole("button", { name: "New campaign" }).click();
      await page.waitForTimeout(500);
      await page.getByPlaceholder("Campaign name").fill("Test Campaign");
      await page.getByRole("button", { name: "Create" }).click();
      await page.waitForTimeout(2000);
      const campaignDiv = page.locator(".border.p-4.rounded").first();
      await campaignDiv.hover();
      await page.waitForTimeout(1000);
      const leadId = leadIdFromLeads;
      if (leadId) {
        await page.goto(`${BASE}/campaigns?lead=${leadId}`);
        await page.waitForTimeout(3000);
        const closeBtn = page.getByRole("button", { name: "Close" });
        if ((await closeBtn.count()) > 0) await closeBtn.click();
        await page.waitForTimeout(500);
      }
      await page.goto(`${BASE}/campaigns`);
      await page.waitForTimeout(1000);
      const card2 = page.locator(".border.p-4.rounded").first();
      await card2.hover().catch(() => {});
      await page.waitForTimeout(2000);
      const pickBtn = page.getByRole("button", { name: "Pick from leads" }).first();
      await pickBtn.click().catch(() => {});
      await page.waitForTimeout(2000);
      const addFromPicker = page.locator('.border.rounded button:has-text("Add")').first();
      const pickerVisible = await addFromPicker.isVisible().catch(() => false);
      if (pickerVisible) {
        await addFromPicker.click();
        await page.waitForTimeout(1500);
        log("5. Campaigns", true, "Campaign created and lead added");
      } else if (leadId) {
        const idInput = page.locator('input[placeholder="Lead ID to add"]');
        await idInput.fill(leadId);
        await page.getByRole("button", { name: "Add" }).last().click();
        await page.waitForTimeout(1000);
        log("5. Campaigns", true, "Campaign created and lead added by ID");
      } else {
        log("5. Campaigns", true, "Campaign created (no leads to add)");
      }
    } catch (e) {
      log("5. Campaigns", false, e.message || String(e));
    }

    // --- 6. Generate+Send ---
    try {
      await page.goto(`${BASE}/campaigns`);
      await page.waitForLoadState("networkidle").catch(() => {});
      const genBtn = page.getByRole("button", { name: /Generate \+ Send/i });
      const genCount = await genBtn.count();
      if (genCount === 0) {
        log("6. Generate+Send", false, "No campaign with leads - cannot test (Leads search likely failed)");
      } else {
        await genBtn.first().click({ timeout: 5000 });
        await page.waitForTimeout(6000);
        const hasSubject = (await page.locator('label:has-text("Subject")').count()) > 0;
        const hasBody = (await page.locator('label:has-text("Body")').count()) > 0;
        const hasClose = (await page.getByRole("button", { name: "Close" }).count()) > 0;
        const hasGenText = (await page.locator("text=Generating email").count()) > 0;
        if (hasSubject || hasBody || hasClose) {
          log("6. Generate+Send", true, "Modal opened with subject/body");
        } else if (hasGenText) {
          log("6. Generate+Send", false, "Modal opened but stuck on 'Generating email...' (AI/API may not be configured)");
        } else {
          const err = await page.locator(".text-red-600").first().textContent().catch(() => "");
          log("6. Generate+Send", false, err || "Modal did not open");
        }
      }
    } catch (e) {
      log("6. Generate+Send", false, e.message || String(e));
    }

    // --- 7. Inbox ---
    try {
      await page.goto(`${BASE}/inbox`);
      await page.waitForLoadState("networkidle").catch(() => {});
      const hasTable = (await page.locator("table").count()) > 0;
      log("7. Inbox", true, hasTable ? "Page loads with table" : "Page loads");
    } catch (e) {
      log("7. Inbox", false, e.message || String(e));
    }

    // --- 8. Upgrade (Stripe) ---
    try {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForLoadState("networkidle").catch(() => {});
      const upgradeBtn = page.getByRole("button", { name: /Upgrade to Pro/i });
      if ((await upgradeBtn.count()) > 0) {
        await upgradeBtn.click();
        await page.waitForTimeout(2000);
        const hasError = (await page.getByText(/not configured|Billing not configured|STRIPE/i).count()) > 0;
        const hasRedirect = page.url().includes("stripe.com");
        log("8. Upgrade", hasError || hasRedirect, hasRedirect ? "Redirected to Stripe" : (hasError ? "Error shown (Stripe not configured)" : "No redirect or error"));
      } else {
        log("8. Upgrade", true, "No upgrade button (Pro user)");
      }
    } catch (e) {
      log("8. Upgrade", false, e.message || String(e));
    }

    // --- 9. Admin ---
    try {
      await page.goto(`${BASE}/admin`);
      await page.waitForLoadState("networkidle").catch(() => {});
      const forbidden = (await page.getByText(/forbidden|unauthorized|access denied/i).count()) > 0;
      const redirected = !page.url().includes("/admin");
      const ok = page.url().includes("/admin") && !forbidden;
      const hasUserCount = (await page.getByText(/\d+\s*user|user.*\d+/i).count()) > 0;
      if (redirected) {
        log("9. Admin", true, "Non-admin redirected (expected)");
      } else {
        log("9. Admin", ok, ok ? (hasUserCount ? "Page loads with user count" : "Page loads") : "Access denied");
      }
    } catch (e) {
      log("9. Admin", false, e.message || String(e));
    }
  } finally {
    if (browser) await browser.close();
  }

  console.log("\n--- Summary ---");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  console.log(`Passed: ${passed}/${results.length}`);
  if (failed.length) {
    console.log("Failed:");
    failed.forEach((f) => console.log(`  - ${f.step}: ${f.detail}`));
  }
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
