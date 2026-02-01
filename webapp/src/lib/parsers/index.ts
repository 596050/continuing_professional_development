/**
 * Transcript parsers for external CPD sources.
 * Each parser takes raw content (CSV text or base64-decoded text) and returns
 * an array of parsed CPD entries.
 */

export interface ParsedEntry {
  title: string;
  provider: string | null;
  hours: number;
  date: string; // ISO date string
  category: string | null;
  activityType: string;
  externalId: string | null;
  source: string;
}

// Main dispatcher
export function parseTranscript(sourceCode: string, content: string): ParsedEntry[] {
  // Try base64 decode first, fallback to raw text
  let text = content;
  if (/^[A-Za-z0-9+/\r\n]+=*\s*$/.test(content.trim()) && !content.includes(",")) {
    try {
      const decoded = Buffer.from(content, "base64").toString("utf-8");
      // Verify decoded looks like valid text (mostly printable ASCII)
      const printable = decoded.replace(/[^\x20-\x7E\t\n\r]/g, "");
      if (printable.length > decoded.length * 0.8) {
        text = decoded;
      }
    } catch {
      // Not base64, use raw
    }
  }

  switch (sourceCode) {
    case "FINPRO_IAR_CE":
      return parseFinProIarCe(text);
    case "CFP_BOARD":
      return parseCfpBoard(text);
    case "SIRCON_CE":
      return parseSirconCe(text);
    case "CE_BROKER":
      return parseCeBroker(text);
    case "CME_PASSPORT":
      return parseCmePassport(text);
    case "NABP_CPE":
      return parseNabpCpe(text);
    case "OPEN_BADGES":
      return parseOpenBadges(text);
    default:
      return parseGenericCsv(text);
  }
}

// FinPro IAR CE transcript (CSV: Course Title, Provider, Credits, Completion Date, Category)
function parseFinProIarCe(text: string): ParsedEntry[] {
  return parseCsvRows(text, (row) => {
    const [title, provider, credits, date, category] = row;
    const hours = parseFloat(credits);
    if (!title || isNaN(hours)) return null;
    return {
      title: title.trim(),
      provider: provider?.trim() || null,
      hours,
      date: normalizeDate(date?.trim()),
      category: mapCategory(category?.trim()),
      activityType: "structured",
      externalId: null,
      source: "FINPRO_IAR_CE",
    };
  });
}

// CFP Board CE summary (CSV: Activity Name, CE Type, Hours, Date Completed, Provider, Status)
function parseCfpBoard(text: string): ParsedEntry[] {
  return parseCsvRows(text, (row) => {
    const [title, ceType, hours, date, provider, status] = row;
    const h = parseFloat(hours);
    if (!title || isNaN(h)) return null;
    if (status?.trim().toLowerCase() === "rejected") return null;
    return {
      title: title.trim(),
      provider: provider?.trim() || null,
      hours: h,
      date: normalizeDate(date?.trim()),
      category: ceType?.trim().toLowerCase().includes("ethics") ? "ethics" : "general",
      activityType: "structured",
      externalId: null,
      source: "CFP_BOARD",
    };
  });
}

// Sircon/Vertafore insurance CE (CSV: Course Name, Hours, Completion Date, License Type, State, Course ID)
function parseSirconCe(text: string): ParsedEntry[] {
  return parseCsvRows(text, (row) => {
    const [title, hours, date, , , courseId] = row;
    const h = parseFloat(hours);
    if (!title || isNaN(h)) return null;
    return {
      title: title.trim(),
      provider: "Sircon",
      hours: h,
      date: normalizeDate(date?.trim()),
      category: "general",
      activityType: "structured",
      externalId: courseId?.trim() || null,
      source: "SIRCON_CE",
    };
  });
}

// CE Broker transcript (CSV: Course Title, Provider, Hours, Date, Category, Status)
function parseCeBroker(text: string): ParsedEntry[] {
  return parseCsvRows(text, (row) => {
    const [title, provider, hours, date, category, status] = row;
    const h = parseFloat(hours);
    if (!title || isNaN(h)) return null;
    if (status?.trim().toLowerCase() === "incomplete") return null;
    return {
      title: title.trim(),
      provider: provider?.trim() || null,
      hours: h,
      date: normalizeDate(date?.trim()),
      category: mapCategory(category?.trim()),
      activityType: "structured",
      externalId: null,
      source: "CE_BROKER",
    };
  });
}

// CME Passport transcript (CSV: Activity Title, Accredited Provider, Credits, Date, Type)
function parseCmePassport(text: string): ParsedEntry[] {
  return parseCsvRows(text, (row) => {
    const [title, provider, credits, date, type] = row;
    const h = parseFloat(credits);
    if (!title || isNaN(h)) return null;
    return {
      title: title.trim(),
      provider: provider?.trim() || null,
      hours: h,
      date: normalizeDate(date?.trim()),
      category: mapCategory(type?.trim()),
      activityType: "structured",
      externalId: null,
      source: "CME_PASSPORT",
    };
  });
}

// NABP CPE Monitor transcript (CSV: Activity Title, ACPE ID, Credits, Date Completed, Provider)
function parseNabpCpe(text: string): ParsedEntry[] {
  return parseCsvRows(text, (row) => {
    const [title, acpeId, credits, date, provider] = row;
    const h = parseFloat(credits);
    if (!title || isNaN(h)) return null;
    return {
      title: title.trim(),
      provider: provider?.trim() || null,
      hours: h,
      date: normalizeDate(date?.trim()),
      category: "general",
      activityType: "structured",
      externalId: acpeId?.trim() || null,
      source: "NABP_CPE",
    };
  });
}

// Open Badges 3.0 JSON parser
function parseOpenBadges(text: string): ParsedEntry[] {
  try {
    const data = JSON.parse(text);
    const badges = Array.isArray(data) ? data : data.badges || data.assertions || [data];
    return badges
      .map((badge: Record<string, unknown>): ParsedEntry | null => {
        const achievement = badge.achievement as Record<string, unknown> | undefined;
        const name = (achievement?.name as string) || (badge.name as string);
        if (!name) return null;
        const criteria = achievement?.criteria as Record<string, unknown> | undefined;
        const issuer = badge.issuer as Record<string, unknown> | undefined;
        return {
          title: name,
          provider: (issuer?.name as string) || null,
          hours: parseFloat(String(achievement?.credits || badge.credits || 1)),
          date: normalizeDate(String(badge.issuedOn || badge.issuanceDate || new Date().toISOString())),
          category: "general",
          activityType: "structured",
          externalId: (badge.id as string) || null,
          source: "OPEN_BADGES",
        };
      })
      .filter((e: ParsedEntry | null): e is ParsedEntry => e !== null);
  } catch {
    return [];
  }
}

// Generic CSV fallback (expects: Title, Hours, Date, Provider, Category)
function parseGenericCsv(text: string): ParsedEntry[] {
  return parseCsvRows(text, (row) => {
    const [title, hours, date, provider, category] = row;
    const h = parseFloat(hours);
    if (!title || isNaN(h)) return null;
    return {
      title: title.trim(),
      provider: provider?.trim() || null,
      hours: h,
      date: normalizeDate(date?.trim()),
      category: mapCategory(category?.trim()),
      activityType: "structured",
      externalId: null,
      source: "GENERIC",
    };
  });
}

// Helpers
function parseCsvRows(text: string, mapper: (row: string[]) => ParsedEntry | null): ParsedEntry[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return []; // Header only or empty
  // Skip header row
  return lines
    .slice(1)
    .map((line) => {
      const row = parseCsvLine(line);
      return mapper(row);
    })
    .filter((e): e is ParsedEntry => e !== null);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function normalizeDate(date: string | undefined): string {
  if (!date) return new Date().toISOString().slice(0, 10);
  // Try various date formats
  const d = new Date(date);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // Try MM/DD/YYYY
  const parts = date.split("/");
  if (parts.length === 3) {
    const [m, d2, y] = parts;
    const parsed = new Date(`${y}-${m.padStart(2, "0")}-${d2.padStart(2, "0")}`);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function mapCategory(cat: string | undefined): string | null {
  if (!cat) return "general";
  const lower = cat.toLowerCase();
  if (lower.includes("ethics") || lower.includes("professional responsibility")) return "ethics";
  if (lower.includes("technical") || lower.includes("products")) return "technical";
  if (lower.includes("regulatory") || lower.includes("compliance")) return "regulatory";
  return "general";
}
