const dir = process.argv[2] || ".";

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let filePath = dir + decodeURIComponent(url.pathname);
    if (filePath.endsWith("/")) filePath += "index.html";

    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Serving ${dir} at http://localhost:3000`);
