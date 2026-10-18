import express, { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { PlanError, sendPlanError } from "../services/plans";

// Express 4 ignores rejected promises from async handlers, so a thrown error
// (e.g. Prisma rejecting NaN or an invalid date) became an unhandled rejection
// and killed the process. Wrap every route handler so rejections reach next().
// Must be imported before any router is built.
const METHODS = ["get", "post", "put", "patch", "delete", "all"] as const;
const RouteProto = (express as unknown as { Route: { prototype: Record<string, Function> } }).Route.prototype;

function wrap(fn: unknown) {
  if (typeof fn !== "function" || fn.length === 4) return fn; // leave error handlers alone
  return function (this: unknown, req: Request, res: Response, next: NextFunction) {
    try {
      const out = fn.call(this, req, res, next);
      if (out && typeof (out as Promise<unknown>).catch === "function") (out as Promise<unknown>).catch(next);
    } catch (err) {
      next(err);
    }
  };
}

for (const method of METHODS) {
  const original = RouteProto[method];
  RouteProto[method] = function (this: unknown, ...handlers: unknown[]) {
    return original.apply(this, handlers.flat(Infinity).map(wrap));
  };
}

/** Last middleware: turn errors into JSON responses instead of crashing. */
export function errorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);
  if (err instanceof PlanError) return sendPlanError(res, err);
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: "Invalid input: check numbers and dates" });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return res.status(404).json({ error: "Not found" });
    if (err.code === "P2002") return res.status(409).json({ error: "That already exists" });
    if (err.code === "P2003") return res.status(400).json({ error: "Linked record not found" });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  console.error(err);
  res.status(err?.status ?? 500).json({ error: err?.status ? err.message : "Internal server error" });
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
