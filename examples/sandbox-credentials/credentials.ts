// Illustrative example written fresh for this portfolio.
// It models the design in my sandbox-credentials proposal. It is not WisdomTree source code.

export type Environment = "sandbox" | "production";

export interface Requester {
  email: string;
  emailVerified: boolean;
  kybApproved: boolean; // full business verification, required only for production
}

export interface CredentialBundle {
  environment: Environment;
  clientId: string;
  scopes: readonly string[];
  secretRetrievable: boolean;
}

export type IssueResult =
  | { ok: true; bundle: CredentialBundle; secret: string }
  | { ok: false; error: string; nextStep: string };

// The core decision: gate each environment on what it actually risks.
// Sandbox moves no real money, so a verified, reachable person is enough.
// Production moves real money, so it keeps full business verification.
const POLICY = {
  sandbox: {
    prefix: "sbx_",
    requiresKyb: false,
    scopes: ["read", "trade", "wallet-mgmt"],
    secretRetrievable: true, // low-risk secret, viewable again from the dashboard
  },
  production: {
    prefix: "live_",
    requiresKyb: true,
    scopes: ["read"], // broader scopes are granted through review, not by default
    secretRetrievable: false, // shown once, then the developer stores it securely
  },
} as const;

export function issueCredentials(
  requester: Requester,
  environment: Environment,
  randomId: () => string = () => crypto.randomUUID().replaceAll("-", ""),
): IssueResult {
  const policy = POLICY[environment];

  // Every refusal says what to do next. A dead end without a next step
  // was the original problem this design set out to fix.
  if (!requester.emailVerified) {
    return {
      ok: false,
      error: "Email address not verified.",
      nextStep: `Click the verification link sent to ${requester.email}, then try again.`,
    };
  }
  if (policy.requiresKyb && !requester.kybApproved) {
    return {
      ok: false,
      error: "Production credentials require completed business verification.",
      nextStep: "Keep building with your sandbox credentials while onboarding is reviewed.",
    };
  }

  return {
    ok: true,
    bundle: {
      environment,
      clientId: policy.prefix + randomId().slice(0, 16),
      scopes: policy.scopes,
      secretRetrievable: policy.secretRetrievable,
    },
    secret: policy.prefix + "secret_" + randomId(),
  };
}

// Environment isolation: the key prefix makes the environment visible at a glance,
// and a sandbox key is rejected outright by production, and vice versa.
export function assertEnvironment(clientId: string, expected: Environment): void {
  const prefix = POLICY[expected].prefix;
  if (!clientId.startsWith(prefix)) {
    const actual = expected === "sandbox" ? "production" : "sandbox";
    throw new Error(
      `This is a ${actual} credential but the request went to ${expected}. ` +
        `Use a key starting with "${prefix}".`,
    );
  }
}
