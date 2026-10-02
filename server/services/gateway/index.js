// API Gateway: CDN Simulation, Rate Limiter, Auth Guard, Request Router
import { usersAuthService } from "../users-auth/index.js";

class ApiGateway {
  constructor() {
    this.rateLimits = new Map(); // IP/token -> { count, resetAt }
    this.requestCount = 0;
    this.blockedCount = 0;
    this.WINDOW_MS = 60000;
    this.MAX_REQUESTS_PER_MIN = 300;
  }

  // Middleware: CDN Edge Cache Headers & Telemetry
  cdnMiddleware(req, res, next) {
    this.requestCount++;
    res.setHeader("X-CDN-Edge-Node", "BLR-EDGE-NODE-04");
    res.setHeader("X-Load-Balancer", "HAProxy-Envoy-v2.1");
    res.setHeader("X-RateLimit-Limit", this.MAX_REQUESTS_PER_MIN);

    // Static catalog endpoints get cache headers
    if (req.method === "GET" && req.path.startsWith("/api/catalog")) {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120");
    } else {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }
    next();
  }

  // Middleware: Token-Bucket Rate Limiter
  rateLimiterMiddleware(req, res, next) {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "localhost";
    const now = Date.now();
    let client = this.rateLimits.get(ip);

    if (!client || now > client.resetAt) {
      client = { count: 1, resetAt: now + this.WINDOW_MS };
      this.rateLimits.set(ip, client);
    } else {
      client.count++;
    }

    res.setHeader("X-RateLimit-Remaining", Math.max(0, this.MAX_REQUESTS_PER_MIN - client.count));

    if (client.count > this.MAX_REQUESTS_PER_MIN) {
      this.blockedCount++;
      return res.status(429).json({
        error: "TOO_MANY_REQUESTS",
        message: "API Gateway rate limit exceeded. Please back off."
      });
    }
    next();
  }

  // Middleware: Role-Based Access Control
  requireRole(allowedRoles = []) {
    return (req, res, next) => {
      const authHeader = req.headers["authorization"];
      const roleHeader = req.headers["x-user-role"] || "CUSTOMER";

      // If no auth specified, allow public endpoints
      if (allowedRoles.length === 0) return next();

      if (!allowedRoles.includes(roleHeader)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: `Access denied. Endpoint requires one of roles: [${allowedRoles.join(", ")}]`
        });
      }
      next();
    };
  }

  getMetrics() {
    return {
      totalRequests: this.requestCount,
      blockedRequests: this.blockedCount,
      activeClients: this.rateLimits.size,
      edgeLocation: "Bengaluru, India (BLR-1)",
      uptimeSeconds: process.uptime()
    };
  }
}

export const apiGateway = new ApiGateway();
