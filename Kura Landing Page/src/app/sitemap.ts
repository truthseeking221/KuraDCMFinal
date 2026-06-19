import type { MetadataRoute } from "next";
import { TESTS, PACKAGES } from "@/data/catalog";

const BASE = "https://kura.med";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/for-doctors",
    "/for-patients",
    "/for-business",
    "/tests",
    "/packages",
    "/pricing",
    "/network",
    "/how-it-works",
    "/results",
    "/about",
    "/faq",
    "/contact",
    "/blog",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date("2026-06-19"),
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const tests = TESTS.map((t) => ({
    url: `${BASE}/tests/${t.slug}`,
    lastModified: new Date("2026-06-19"),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const packages = PACKAGES.map((p) => ({
    url: `${BASE}/packages/${p.slug}`,
    lastModified: new Date("2026-06-19"),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...routes, ...tests, ...packages];
}
