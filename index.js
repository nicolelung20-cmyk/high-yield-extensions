const http = require("http");
const { createRegistry } = require("./integrations/registry");

const PORT = process.env.PORT || 3000;
const registry = createRegistry();

const server = http.createServer((req, res) => {
  // Dashboard health: which of the three providers are actually live.
  if (req.url === "/integrations/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ providers: registry.health() }, null, 2));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(
    "high-yield-extensions: browser extension boilerplate collection.\n" +
      "See README.md and the extension-* branches for individual project sources.\n" +
      "Integration health: /integrations/health\n"
  );
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
