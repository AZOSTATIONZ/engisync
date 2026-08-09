import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Which actions require a verified email — asserted against the SOURCE.
 *
 * WHY A SOURCE TEST RATHER THAN A BEHAVIOUR TEST
 * `verifiedAccountGate` is a one-line call at the top of a server action. It
 * is the kind of line that gets dropped during a refactor without anything
 * failing: the action still works, the tests still pass, and the only symptom
 * is that a protection quietly stopped existing. Nothing else in the codebase
 * would notice.
 *
 * This pins the LIST. Adding a sensitive action means adding it here, which is
 * the point — the same reasoning as the document-template test that requires
 * every section to declare its evidence expectations.
 *
 * THE GATE IS DORMANT UNTIL EMAIL WORKS. `verifiedAccountGate` returns null
 * when SMTP is unconfigured, so none of this blocks anyone today. That is
 * deliberate: 38 of 41 production accounts are unverified precisely because
 * email has never worked in production, and enforcing verification before
 * making verification possible would lock out most of the userbase with no
 * route back in.
 */

const ROOT = join(process.cwd(), "src");

/**
 * Actions whose consequences reach OUTSIDE the account: publication, handing
 * credentials to other people, and money.
 */
const GATED: { file: string; fn: string; why: string }[] = [
  {
    file: "app/dashboard/projects/access-actions.ts",
    fn: "createWorkspace",
    why: "creates a project other students will join",
  },
  {
    file: "app/dashboard/projects/access-actions.ts",
    fn: "createInvite",
    why: "mints a join credential for someone outside the project",
  },
  {
    file: "app/dashboard/projects/access-actions.ts",
    fn: "inviteByEmail",
    why: "sends mail to a third party in this user's name",
  },
  {
    file: "app/dashboard/projects/[id]/document/evidence-actions.ts",
    fn: "shareEvidence",
    why: "creates a public URL to project work",
  },
  {
    file: "app/dashboard/settings/profile-actions.ts",
    fn: "updatePublicProfile",
    why: "publishes a portfolio to the open internet",
  },
  {
    file: "app/dashboard/projects/[id]/money/finance-actions.ts",
    fn: "createContributionRequest",
    why: "asks teammates to pay money in",
  },
  {
    file: "app/dashboard/projects/[id]/money/finance-actions.ts",
    fn: "savePaymentInstructions",
    why: "publishes the account details teammates will send money to",
  },
  {
    file: "app/dashboard/departments/actions.ts",
    fn: "joinDepartment",
    why: "grants sight of a department's members and announcements",
  },
];

/** Body of one exported async function, up to the next top-level export. */
function functionBody(source: string, fn: string): string | null {
  const start = source.indexOf(`export async function ${fn}(`);
  if (start === -1) return null;
  const next = source.indexOf("\nexport ", start + 1);
  return source.slice(start, next === -1 ? undefined : next);
}

describe("verified-email gates", () => {
  for (const { file, fn, why } of GATED) {
    it(`${fn} requires a verified email — ${why}`, () => {
      const source = readFileSync(join(ROOT, file), "utf8");
      const body = functionBody(source, fn);

      // A missing function means it was renamed or moved. Failing loudly is
      // correct: a silently absent gate is the exact failure this prevents.
      expect(body, `${fn} not found in ${file}`).not.toBeNull();
      expect(body).toContain("verifiedAccountGate");
    });
  }

  it("does NOT gate ordinary coursework", () => {
    // Uploading evidence and declaring a payment you already made must stay
    // open. Blocking those would punish a student for an operator failing to
    // configure SMTP — the student loses marks, the operator notices nothing.
    const evidence = readFileSync(
      join(ROOT, "app/dashboard/projects/[id]/document/evidence-actions.ts"),
      "utf8",
    );
    expect(functionBody(evidence, "uploadEvidence")).not.toContain(
      "verifiedAccountGate",
    );

    const finance = readFileSync(
      join(ROOT, "app/dashboard/projects/[id]/money/finance-actions.ts"),
      "utf8",
    );
    expect(functionBody(finance, "declarePayment")).not.toContain(
      "verifiedAccountGate",
    );
  });

  it("stays dormant while email is unconfigured", () => {
    // The property that makes shipping this safe today. If someone removes
    // this early return, every unverified account loses these actions at once
    // — and cannot verify, because the same condition means no mail can be
    // sent.
    const gate = readFileSync(join(ROOT, "lib/verification.ts"), "utf8");
    const body = functionBody(gate, "verifiedAccountGate");
    expect(body).toContain("if (!isEmailConfigured()) return null;");
  });

  it("exempts accounts verified by an OAuth provider", () => {
    // Signing in with Google proves control of the address more strongly than
    // our own click-a-link flow does. Asking those users to verify again would
    // be asking them to prove something already proven.
    const gate = readFileSync(join(ROOT, "lib/verification.ts"), "utf8");
    const body = functionBody(gate, "verifiedAccountGate");
    expect(body).toContain("accounts");
  });
});

describe("password reset as proof of address ownership", () => {
  const resetSource = readFileSync(
    join(ROOT, "app/(auth)/forgot/actions.ts"),
    "utf8",
  );

  it("marks the email verified on a completed reset", () => {
    // Redeeming a link that was sent to an address IS proof of controlling
    // that mailbox — the same proof the verification flow asks for. Without
    // this, a user who demonstrably received our mail stays blocked by the
    // Phase 5 gates, and the only route out is a banner almost nobody seeks.
    expect(resetSource).toContain("emailVerified:");
  });

  it("does NOT overwrite an existing verification timestamp", () => {
    // The column answers "when did they first prove this address?", so a
    // long-verified account must keep its original date rather than having it
    // reset every time the password changes.
    expect(resetSource).toContain("existing?.emailVerified ?? new Date()");
  });

  it("records the reset with its address and device", () => {
    // This was the ONLY event in the activity list with no IP and no device,
    // because it wrote to auditLog directly. It is also the event where
    // "where did this come from?" matters most.
    expect(resetSource).toContain("recordSecurityEvent");
    expect(resetSource).toContain("clientIp(h)");
    expect(resetSource).toContain('h.get("user-agent")');
  });

  it("still revokes every existing session", () => {
    // Pinned alongside the above so a future edit to this block cannot
    // quietly drop the revocation — a reset that leaves an intruder signed in
    // is not a reset.
    expect(resetSource).toContain("sessionVersion: { increment: 1 }");
  });
});
