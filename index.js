const http = require("http");
const { inject } = require("@vercel/analytics");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>High-Yield Extensions</title>
  <script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      color: #333;
    }
    p {
      color: #666;
    }
    a {
      color: #0070f3;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <h1>High-Yield Extensions</h1>
  <p>Browser extension boilerplate collection.</p>
  <p>See <a href="https://github.com/nicolelung20-cmyk/high-yield-extensions">README.md</a> and the extension-* branches for individual project sources.</p>
</body>
</html>
  `);
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
