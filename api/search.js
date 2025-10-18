// api/search.js
import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  const { query, gender } = req.body;
  if (!query) return res.status(400).json({ ok: false, error: "Missing query" });

  try {
    // Build smart query
    const genderSuffix = gender ? `${gender} ` : "";
    const fullQuery = `${query} clothes ${genderSuffix}https://forge.pleb.masters.de`;

    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(fullQuery)}`;
    const { data } = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });

    const $ = cheerio.load(data);
    let found = null;

    $("a.result__a").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text();
      if (href && href.includes("forge.plebmasters.de") && /clothes/.test(href)) {
        found = { text, href };
        return false;
      }
    });

    if (!found) return res.json({ ok: false, message: "No matching link found" });

    // Determine gender from text if possible
    let detectedGender = "Unknown";
    const desc = found.text.toLowerCase();
    if (desc.includes("female")) detectedGender = "Female";
    else if (desc.includes("male")) detectedGender = "Male";

    return res.json({
      ok: true,
      query,
      gender: detectedGender,
      result: found,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Search failed" });
  }
}
