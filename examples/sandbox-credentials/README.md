# Example: self-serve sandbox credentials

*This is an illustrative example I wrote fresh for this portfolio. It models the design from my WisdomTree Connect proposal, but it is not WisdomTree source code.*

## The problem

A developer who wanted to try the API hit a dead end on step one of the Quickstart. Sandbox credentials only existed after the developer's organization finished full institutional onboarding, which included business verification, dual-control users, and wallet review. That's the right bar for moving real money, but it meant nobody could make a single test call without going through a human-mediated process first.

I benchmarked how Stripe, Plaid, and Fireblocks handle this. All three give a developer a working sandbox credential the moment they sign up.

## The decision

Sandbox and production are different risk surfaces, so each should be gated on what it actually risks:

| | Sandbox | Production |
| --- | --- | --- |
| Moves real money | No | Yes |
| Required to get credentials | Verified email | Verified email and business verification |
| Default scopes | Full test scopes | Read only, broader scopes through review |
| Secret | Viewable again from the dashboard | Shown once |
| Key prefix | `sbx_` | `live_` |

Two smaller decisions came out of research and testing:

- **Every refusal names a next step.** The original problem was a dead end, so the code never returns an error without telling the developer what to do. A developer blocked from production is pointed back to the sandbox, so onboarding review never stops them from building.
- **Environment is visible in the key itself.** Like Stripe's `sk_test_` and `sk_live_` keys, the prefix shows at a glance which environment a key belongs to, and a key sent to the wrong environment is rejected with a message that says why.

I also corrected an assumption along the way. My first draft made sandbox secrets one-time reveal, matching production. When I checked Plaid's sandbox docs, Plaid keeps sandbox secrets viewable in the dashboard, because a test secret carries none of the risk that justifies one-time reveal. The design now treats the two differently.

## The code

- [`credentials.ts`](credentials.ts) holds the policy table and the issuance and environment-check functions.
- [`credentials.test.ts`](credentials.test.ts) has five tests, one for each rule above.

To run the tests (requires Node 22 or later):

```bash
npx tsx --test credentials.test.ts
```

## Why it carries over

The underlying question, how to make the first five minutes with an API frictionless without weakening the controls on real money, applies to any payments platform. The pattern here is to separate environments by risk, make the environment obvious, and never leave a developer at a dead end.
