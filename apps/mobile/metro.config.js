const { getDefaultConfig } = require("expo/metro-config");
const http = require("http");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const API_PORT = Number(process.env.YUVMI_API_PORT ?? 8080);

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.alias = {
  "@": path.resolve(projectRoot, "src"),
};

function proxyToApi(req, res) {
  const headers = { ...req.headers, host: `127.0.0.1:${API_PORT}` };
  delete headers.origin;
  delete headers.connection;

  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    },
  );

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: { message: `API'ye ulaşılamadı (proxy :${API_PORT}): ${err.message}` },
      }),
    );
  });

  req.pipe(proxyReq, { end: true });
}

const previousEnhance = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const nextMiddleware = previousEnhance
      ? previousEnhance(middleware, server)
      : middleware;
    return (req, res, next) => {
      if (req.url && req.url.startsWith("/api/")) {
        proxyToApi(req, res);
        return;
      }
      return nextMiddleware(req, res, next);
    };
  },
};

module.exports = config;
