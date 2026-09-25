const realFetch = globalThis.fetch;

// No network in the test run, ever. Tests inject their own fetch. data: URIs are allowed
// because satori's yoga-layout loads its WASM by fetching one. GOTCHAS 037.
globalThis.fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("data:")) return realFetch(input, init);
  throw new Error(`Network access in tests (${url.slice(0, 60)}). Inject a fixture fetch instead.`);
};
