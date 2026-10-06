import crypto from "crypto";

const AUTH_SECRET = process.env.AUTH_SECRET || "agentmaxx-secure-auth-secret-key-2026";
const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface VerifiedSession {
  userId: string;
  isWallet: boolean;
  address?: string;
  isAuthenticated: boolean;
  token: string;
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

/**
 * Generate a cryptographically signed session token.
 * Token format: base64(userId:isWallet:timestamp):signature
 */
export function createSessionToken(userId: string, isWallet = false, address?: string): string {
  const cleanUser = (address || userId || "guest_user").toLowerCase().trim();
  const timestamp = Date.now();
  const rawPayload = `${cleanUser}:${isWallet ? "1" : "0"}:${timestamp}`;
  const payloadBase64 = Buffer.from(rawPayload, "utf8").toString("base64url");
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify session token integrity and expiration.
 */
export function verifySessionToken(token: string): { userId: string; isWallet: boolean; address?: string } | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const expectedSig = signPayload(payloadBase64);

  // Constant-time comparison
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const rawPayload = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const [userId, isWalletFlag, timestampStr] = rawPayload.split(":");
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_MAX_AGE_MS) {
      return null;
    }

    const isWallet = isWalletFlag === "1";
    return {
      userId,
      isWallet,
      address: isWallet ? userId : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Extract and authenticate user session from incoming Request headers or cookies.
 * NEVER trusts client-supplied query/body userId without a matching valid token.
 */
export function getAuthenticatedSession(req: Request): VerifiedSession {
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
    const verified = verifySessionToken(rawToken);
    if (verified) {
      return {
        userId: verified.userId,
        isWallet: verified.isWallet,
        address: verified.address,
        isAuthenticated: true,
        token: rawToken,
      };
    }
  }

  // Fallback: generate a default guest session token
  const defaultGuestId = "guest_default";
  const guestToken = createSessionToken(defaultGuestId, false);
  return {
    userId: defaultGuestId,
    isWallet: false,
    isAuthenticated: false,
    token: guestToken,
  };
}
