import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/register`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site.url}/login`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
