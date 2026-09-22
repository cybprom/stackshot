// Known noise: dropped before mapping and never logged as unmapped, so the unmapped log
// stays a backlog of real technologies. `*` matches any run of characters.
export const DENY: readonly string[] = [
  // Types, lint/format config, and transpiler plumbing.
  "npm:@types/*",
  "npm:eslint-config-*",
  "npm:eslint-plugin-*",
  "npm:@*/eslint-plugin",
  "npm:@*/eslint-config",
  "npm:@typescript-eslint/*",
  "npm:typescript-eslint",
  "npm:prettier-plugin-*",
  "npm:@babel/*",
  "npm:babel-plugin-*",
  "npm:babel-preset-*",
  "npm:tslib",
  // Script and hook plumbing.
  "npm:husky",
  "npm:lint-staged",
  "npm:cross-env",
  "npm:rimraf",
  "npm:npm-run-all",
  "npm:concurrently",
  "npm:dotenv",
  "gem:dotenv",
  "pypi:python-dotenv",
  // CI plumbing every workflow uses; GitHub Actions itself comes from tool:github-actions.
  "action:actions/checkout",
  "action:actions/cache",
  "action:actions/upload-artifact",
  "action:actions/download-artifact",
  "action:actions/github-script",
  "action:actions/stale",
  "action:actions/labeler",
  "action:actions/add-to-project",
  "action:actions/create-github-app-token",
  "action:swatinem/rust-cache",
  // Base OS images say nothing about the stack.
  "docker:ubuntu",
  "docker:debian",
  "docker:alpine",
  "docker:busybox",
  "docker:buildpack-deps",
];
