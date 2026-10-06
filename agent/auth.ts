import crypto from "crypto";
import { verifyMessage, getAddress, isAddress } from "viem";

const AUTH_SECRET = process.env.AUTH_SECRET || "agentmaxx-secure-auth-secret-key-2026";
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days token lifetime
const CHALLENGE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes challenge validity

export interface VerifiedSession {
  userId: string;
  isWallet: boolean;
  address?: string;
  isAuthenticated: boolean;
  token: string;
}

export type TokenVerificationResult =
  | { valid: true; userId: string; isWallet: boolean; address?: string }
  | { valid: false; reason: "INVALID_SIGNATURE" | "EXPIRED" | "MALFORMED" | "MISSING" };

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

/**
 * Generate a cryptographically signed session token.
 * Token format: base64url(userId:isWallet:timestamp):signature
 */
export function createSessionToken(userId: string, isWallet = false, address?: string): string {
  const cleanUser = (address || userId).toLowerCase().trim();
  const timestamp = Date.now();
  const rawPayload = `${cleanUser}:${isWallet ? "1" : "0"}:${timestamp}`;
  const payloadBase64 = Buffer.from(rawPayload, "utf8").toString("base64url");
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

/**
 * Creates a unique server-generated guest identity.
 * Strictly prevents client from choosing arbitrary guest identities.
 */
export function createServerGuestSession(): { userId: string; token: string } {
  const guestId = `guest_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const token = createSessionToken(guestId, false);
  return { userId: guestId, token };
}

/**
 * Verify session token integrity, signature and expiration.
 */
export function verifySessionTokenDetailed(token: string): TokenVerificationResult {
  if (!token || typeof token !== "string" || !token.trim()) {
    return { valid: false, reason: "MISSING" };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "MALFORMED" };
  }

  const [payloadBase64, signature] = parts;
  const expectedSig = signPayload(payloadBase64);

  // Constant-time signature comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  try {
    const rawPayload = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const [userId, isWalletFlag, timestampStr] = rawPayload.split(":");
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      return { valid: false, reason: "MALFORMED" };
    }

    if (Date.now() - timestamp > TOKEN_MAX_AGE_MS) {
      return { valid: false, reason: "EXPIRED" };
    }

    const isWallet = isWalletFlag === "1";
    return {
      valid: true,
      userId,
      isWallet,
      address: isWallet ? userId : undefined,
    };
  } catch {
    return { valid: false, reason: "MALFORMED" };
  }
}

export function verifySessionToken(token: string): { userId: string; isWallet: boolean; address?: string } | null {
  const res = verifySessionTokenDetailed(token);
  if (res.valid) {
    return { userId: res.userId, isWallet: res.isWallet, address: res.address };
  }
  return null;
}

/**
 * Verifies cryptographic proof of wallet ownership (EIP-191 personal_sign).
 * Requires client to sign a verifiable challenge containing timestamp.
 */
export async function verifyWalletOwnership(params: {
  address: string;
  message: string;
  signature: string;
}): Promise<{ success: boolean; checksumAddress?: string; error?: string }> {
  const { address, message, signature } = params;

  if (!address || !isAddress(address)) {
    return { success: false, error: "Invalid Ethereum address format." };
  }

  if (!message || !signature) {
    return { success: false, error: "Challenge message and signature are required." };
  }

  try {
    const checksumAddress = getAddress(address);

    // Verify cryptographic signature via viem
    const isValid = await verifyMessage({
      address: checksumAddress,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return { success: false, error: "Cryptographic signature does not match the claiming wallet address." };
    }

    // Parse challenge timestamp to prevent replay attacks
    const timeMatch = message.match(/timestamp:\s*(\d+)/i);
    if (timeMatch && timeMatch[1]) {
      const msgTime = parseInt(timeMatch[1], 10);
      if (Math.abs(Date.now() - msgTime) > CHALLENGE_MAX_AGE_MS) {
        return { success: false, error: "Challenge timestamp has expired (must be signed within 5 minutes)." };
      }
    }

    return { success: true, checksumAddress };
  } catch (err: any) {
    return { success: false, error: `Signature verification failed: ${err.message}` };
  }
}

/**
 * Extract and authenticate user session from incoming Request headers or cookies.
 * NEVER trusts client-supplied query/body userId without a matching valid token.
 */
export function getAuthenticatedSession(req: Request, allowGuestFallback = true): VerifiedSession | null {
  const authHeader = req.headers.get("authorization") || "";
  const sessionHeader = req.headers.get("x-session-token") || "";
  const cookieHeader = req.headers.get("cookie") || "";

  let rawToken = "";

  if (authHeader.startsWith("Bearer ")) {
    rawToken = authHeader.slice(7).trim();
  } else if (sessionHeader) {
    rawToken = sessionHeader.trim();
  } else if (cookieHeader) {
    const match = cookieHeader.match(/agent_session=([^;]+)/);
    if (match) rawToken = decodeURIComponent(match[1]).trim();
  }

  if (rawToken) {
    const verification = verifySessionTokenDetailed(rawToken);
    if (verification.valid) {
      return {
        userId: verification.userId,
        isWallet: verification.isWallet,
        address: verification.address,
        isAuthenticated: true,
        token: rawToken,
      };
    }
  }

  if (!allowGuestFallback) {
    return null;
  }

  // Fallback: Generate a fresh server-created guest session
  const guest = createServerGuestSession();
  return {
    userId: guest.userId,
    isWallet: false,
    isAuthenticated: false,
    token: guest.token,
  };
}
