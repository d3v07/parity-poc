/** Load .env into process.env at startup (no-op if absent, e.g. in CI where
 *  env is already injected). Imported first by entry points so secrets are
 *  available before the model client reads them. */
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}
