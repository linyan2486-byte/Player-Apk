import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";

const COOKIE = "mg_flash_admin";
const maxAge = 7 * 24 * 60 * 60 * 1000;
function secret() { return ENV.jwtSecret || ENV.adminPassword || "change-this-admin-secret"; }
function sign(value: string) { return crypto.createHmac("sha256", secret()).update(value).digest("hex"); }
function makeToken() { const payload = Buffer.from(JSON.stringify({ u: ENV.adminUsername, exp: Date.now() + maxAge })).toString("base64url"); return `${payload}.${sign(payload)}`; }
function validToken(token?: string) { if (!token) return false; const [payload, signature] = token.split("."); if (!payload || !signature || signature.length !== sign(payload).length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(payload)))) return false; try { const data = JSON.parse(Buffer.from(payload, "base64url").toString()); return data.u === ENV.adminUsername && data.exp > Date.now(); } catch { return false; } }
function tokenFrom(req: Request) { return req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1); }
export function isStandaloneAdmin(req: Request) { return validToken(tokenFrom(req)); }
export function registerStandaloneAuth(app: Express) {
  app.post("/api/admin/login", (req, res) => {
    if (!ENV.adminPassword) { res.status(503).json({ error: "ADMIN_PASSWORD is not configured" }); return; }
    if (req.body?.password !== ENV.adminPassword) { res.status(401).json({ error: "Invalid admin password" }); return; }
    res.cookie(COOKIE, makeToken(), { httpOnly: true, sameSite: "lax", secure: ENV.isProduction, maxAge });
    res.json({ success: true, username: ENV.adminUsername });
  });
  app.post("/api/admin/logout", (_req, res) => { res.clearCookie(COOKIE); res.json({ success: true }); });
  app.get("/api/admin/me", (req, res) => { res.json({ authenticated: isStandaloneAdmin(req), username: isStandaloneAdmin(req) ? ENV.adminUsername : null }); });
}
