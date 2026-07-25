import * as OTPAuth from "otpauth";

const ISSUER = "EngiSync";

/** Generate a new base32 TOTP secret. */
export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function totp(secret: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

/** The otpauth:// URL to encode in a QR code. */
export function otpauthUrl(secret: string, label: string): string {
  return totp(secret, label).toString();
}

/** Validate a 6-digit code (±1 time step tolerance). */
export function verifyTotp(secret: string, token: string): boolean {
  if (!token || !/^\d{6}$/.test(token.trim())) return false;
  const delta = totp(secret, ISSUER).validate({ token: token.trim(), window: 1 });
  return delta !== null;
}
