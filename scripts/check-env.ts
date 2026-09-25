// Runs before `next build`. Missing configuration fails the deploy here, where it is one
// red build, rather than at module scope in the route, where it would be a broken image in
// every README that embeds a card. lib/env.ts never throws for the same reason.
import { REQUIRED_IN_PRODUCTION, missingRequired } from "@/lib/env";

const missing = missingRequired();
if (missing.length > 0) {
  console.error(`Missing required environment: ${missing.join(", ")}`);
  console.error(`Required for a production build: ${REQUIRED_IN_PRODUCTION.join(", ")}`);
  process.exit(1);
}
console.log(`env ok (${REQUIRED_IN_PRODUCTION.length} required vars present)`);
