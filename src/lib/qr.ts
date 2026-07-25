import QRCode from "qrcode";
import { headers } from "next/headers";

/** Resolve the app's base URL from env or the incoming request. */
export async function getBaseUrl(): Promise<string> {
  const fromEnv = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/** Build the shareable join link for a workspace. */
export async function buildJoinUrl(joinCode: string): Promise<string> {
  const base = await getBaseUrl();
  return `${base}/dashboard/workspaces?join=${encodeURIComponent(joinCode)}`;
}

/** Generate a PNG data URL QR code for the given text. */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
