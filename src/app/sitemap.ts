import type { MetadataRoute } from "next";

const SITE_URL = "https://limuda.co.il";

const STUDY_ROUTES = [
  "talmud",
  "tanakh",
  "mishnah",
  "rambam",
  "sefer-hamitzvot",
  "tehillim",
  "perek-shirah",
  "kitzur-shulchan-aruch",
  "chofetz-chaim",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...STUDY_ROUTES.map((route) => ({
      url: `${SITE_URL}/study/${route}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
