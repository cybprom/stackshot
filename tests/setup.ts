// No network in the test run, ever. Tests inject their own fetch.
globalThis.fetch = () => {
  throw new Error("Network access in tests. Inject a fixture fetch instead.");
};
