/**
 * Provider-agnostic email sender.
 * - If RESEND_API_KEY is set → send via Resend's HTTP API (no dependency).
 * - Else if SMTP_HOST/SMTP_USER/SMTP_PASS are set → send via SMTP (nodemailer).
 * - Otherwise email is "not configured": sends are skipped (never throws), so
 *   the rest of the app keeps working without an email service.
 */

export type EmailProvider = "resend" | "smtp" | null;

export function getEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return "smtp";
  }
  return null;
}

export function isEmailConfigured(): boolean {
  return getEmailProvider() !== null;
}

export function providerName(): string {
  const p = getEmailProvider();
  if (p === "resend") return "Resend";
  if (p === "smtp") return "SMTP";
  return "not configured";
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || "EngiSync <onboarding@resend.dev>";
}

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendResult = { sent: boolean; skipped?: boolean; error?: string };

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const provider = getEmailProvider();
  if (!provider) return { sent: false, skipped: true };

  const text = args.text ?? args.html.replace(/<[^>]+>/g, " ");

  try {
    if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromAddress(),
          to: [args.to],
          subject: args.subject,
          html: args.html,
          text,
        }),
      });
      if (!res.ok) {
        return { sent: false, error: `Resend error ${res.status}` };
      }
      return { sent: true };
    }

    // SMTP via nodemailer (dynamically imported so it's only needed for SMTP).
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: fromAddress(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

/** Minimal branded HTML wrapper for transactional emails. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
    <div style="font-weight:700;font-size:18px;color:#2563eb;margin-bottom:16px">⚙️ EngiSync</div>
    <h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
    <div style="font-size:14px;line-height:1.6;color:#334155">${bodyHtml}</div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
    <p style="font-size:12px;color:#94a3b8">EngiSync · engineering collaboration platform</p>
  </div>`;
}
