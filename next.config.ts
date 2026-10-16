import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import type { NextConfig } from "next";

// A dynamic id baked into public/sw.js and the client bundle so the browser
// can tell a new deploy apart from the last one. public/ is served as static
// files, untouched by Next's build-time asset hashing, so without this
// sw.js's bytes never change between deploys and PwaUpdatePrompt.tsx never
// sees an update to prompt for.
// Next re-evaluates this config module more than once per build (separate
// compiler passes, plus the "runtime startup" re-evaluation noted below).
// Cache the id at module scope so every call within the process agrees on
// the exact same string — otherwise the sw.js stamp and the client-bundled
// NEXT_PUBLIC_BUILD_ID can drift apart and the update banner never clears.
let cachedBuildId: string | undefined;

function resolveBuildId(): string {
  if (cachedBuildId) return cachedBuildId;

  let commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  if (!commit) {
    try {
      commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      commit = undefined;
    }
  }
  const stamp = Date.now().toString(36);
  cachedBuildId = commit ? `${commit}-${stamp}` : stamp;
  return cachedBuildId;
}

export default function nextConfig(phase: string): NextConfig {
  const buildId = resolveBuildId();

  // Only stamp the file during an actual `next build`. The config module is
  // also re-evaluated at server/runtime startup (including on Vercel's
  // read-only serverless filesystem), where writing to disk would throw.
  if (phase === PHASE_PRODUCTION_BUILD) {
    const swPath = path.join(process.cwd(), "public", "sw.js");
    const swSource = fs.readFileSync(swPath, "utf8");
    fs.writeFileSync(
      swPath,
      swSource.replace(/const SW_VERSION = "[^"]*";/, `const SW_VERSION = "${buildId}";`)
    );
  }

  return {
    generateBuildId: async () => buildId,
    env: {
      NEXT_PUBLIC_BUILD_ID: buildId,
    },
    /* config options here */
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            {
              key: "X-Frame-Options",
              value: "DENY",
            },
            {
              key: "X-Content-Type-Options",
              value: "nosniff",
            },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin",
            },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
            },
            {
              key: "X-XSS-Protection",
              value: "1; mode=block",
            },
          ],
        },
        {
          source: "/firebase-messaging-sw.js",
          headers: [
            {
              key: "Cache-Control",
              value: "no-cache, no-store, must-revalidate",
            },
          ],
        },
        {
          source: "/sw.js",
          headers: [
            {
              key: "Cache-Control",
              value: "no-cache, no-store, must-revalidate",
            },
            {
              key: "Service-Worker-Allowed",
              value: "/",
            },
          ],
        },
      ];
    },
  };
}
