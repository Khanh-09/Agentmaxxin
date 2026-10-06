import {
  createServerGuestSession,
  createSessionToken,
  verifySessionTokenDetailed,
  verifyWalletOwnership,
  getAuthenticatedSession,
  issueChallengeNonce,
} from "@/agent/auth";

// GET /api/auth/session -> Checks existing session or returns a new server-generated guest token + challenge template
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetAddress = searchParams.get("address") || undefined;
    const requestChallenge = searchParams.get("challenge") === "true" || Boolean(targetAddress);

    const authHeader = req.headers.get("authorization") || "";
    let rawToken = "";
    if (authHeader.startsWith("Bearer ")) {
      rawToken = authHeader.slice(7).trim();
    }

    if (rawToken && !requestChallenge) {
      const detailed = verifySessionTokenDetailed(rawToken);
      if (!detailed.valid) {
        return Response.json(
          {
            valid: false,
            error:
              detailed.reason === "EXPIRED"
                ? "Session token has expired. Please sign in again."
                : detailed.reason === "INVALID_SIGNATURE"
                ? "Invalid token cryptographic signature."
                : "Malformed session token.",
            reason: detailed.reason,
          },
          { status: 401 }
        );
      }
      return Response.json({
        valid: true,
        userId: detailed.userId,
        isWallet: detailed.isWallet,
        address: detailed.address,
        token: rawToken,
      });
    }

    // No token provided or challenge requested: generate fresh server-created guest session and issue single-use challenge nonce
    const guest = createServerGuestSession();
    const { challenge, nonce } = issueChallengeNonce(targetAddress);

    return Response.json({
      valid: true,
      userId: guest.userId,
      isWallet: false,
      token: guest.token,
      challengeTemplate: challenge,
      nonce,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/auth/session -> Authenticates wallet with cryptographic signature or generates clean server guest session
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address, message, signature } = body;

    // If client attempts to authenticate as a wallet address
    if (address) {
      if (!signature || !message) {
        return Response.json(
          {
            error:
              "Proof of wallet ownership required. Please provide a cryptographic signature for the challenge message.",
          },
          { status: 401 }
        );
      }

      const verification = await verifyWalletOwnership({ address, message, signature });
      if (!verification.success || !verification.checksumAddress) {
        return Response.json(
          { error: verification.error || "Invalid wallet signature proof." },
          { status: 401 }
        );
      }

      const walletToken = createSessionToken(
        verification.checksumAddress,
        true,
        verification.checksumAddress
      );

      return Response.json({
        success: true,
        userId: verification.checksumAddress.toLowerCase(),
        address: verification.checksumAddress,
        isWallet: true,
        token: walletToken,
      });
    }

    // Otherwise, generate a strict server-generated guest session (ignores any custom guestId client attempts to inject)
    const guest = createServerGuestSession();
    return Response.json({
      success: true,
      userId: guest.userId,
      isWallet: false,
      token: guest.token,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
