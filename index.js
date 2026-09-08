const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(
    "high-yield-extensions: browser extension boilerplate collection.\n" +
      "See README.md and the extension-* branches for individual project sources.\n"
  );
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
