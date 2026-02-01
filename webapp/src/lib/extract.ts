/**
 * AI-Powered Evidence Extraction Engine
 *
 * Extracts metadata from uploaded evidence files using pattern matching
 * and heuristics. Analyzes filenames, text content, and known patterns
 * to identify dates, hours, providers, categories, and credentials.
 */

import { readFileSync } from "fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedMetadata {
  title?: string;
  provider?: string;
  date?: string;
  hours?: number;
  category?: string;
  credentialMatch?: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Known providers and credential patterns
// ---------------------------------------------------------------------------

const KNOWN_PROVIDERS = [
  { pattern: /\bCII\b/i, name: "CII" },
  { pattern: /\bCISI\b/i, name: "CISI" },
  { pattern: /\bFCA\b/i, name: "FCA" },
  { pattern: /\bCFP\s*Board\b/i, name: "CFP Board" },
  { pattern: /\bFINRA\b/i, name: "FINRA" },
  { pattern: /\bASIC\b/i, name: "ASIC" },
  { pattern: /\bFASEA\b/i, name: "FASEA" },
  { pattern: /\bNASBA\b/i, name: "NASBA" },
  { pattern: /\bIFOA\b/i, name: "IFoA" },
  { pattern: /\bICB\b/i, name: "ICB" },
  { pattern: /\bAAT\b/i, name: "AAT" },
  { pattern: /\bACCA\b/i, name: "ACCA" },
  { pattern: /\bICAEW\b/i, name: "ICAEW" },
  { pattern: /\bCPA\s*(Australia)?\b/i, name: "CPA" },
  { pattern: /\bFP\s*Canada\b/i, name: "FP Canada" },
  { pattern: /\bMAS\b/i, name: "MAS" },
  { pattern: /\bSFC\b/i, name: "SFC" },
  { pattern: /\bNMC\b/i, name: "NMC" },
  { pattern: /\bIESBA\b/i, name: "IESBA" },
];

const PROVIDER_LINE_PATTERNS = [
  /(?:Provider|Issued\s+by|Organization|Organisation|Issuer|Accredited\s+by)\s*:\s*(.+)/i,
];

const KNOWN_CREDENTIALS = [
  { pattern: /\bCFP\b/i, name: "CFP" },
  { pattern: /\bCII[\s/]*PFS\b/i, name: "CII/PFS" },
  { pattern: /\bPFS\b/i, name: "CII/PFS" },
  { pattern: /\bCISI\b/i, name: "CISI" },
  { pattern: /\bFCA\s+Adviser\b/i, name: "FCA" },
  { pattern: /\bFASEA\b/i, name: "FASEA" },
  { pattern: /\bCPA\b/i, name: "CPA" },
  { pattern: /\bCFA\b/i, name: "CFA" },
  { pattern: /\bRFP\b/i, name: "RFP" },
  { pattern: /\bFinPro\b/i, name: "FinPro" },
];

// ---------------------------------------------------------------------------
// Category keyword mappings
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  ethics: [
    "ethics", "ethical", "conduct", "compliance", "integrity",
    "anti-money laundering", "aml", "regulatory", "code of conduct",
    "professional standards", "fiduciary",
  ],
  technical: [
    "technical", "investment", "portfolio", "tax", "taxation",
    "financial planning", "estate planning", "retirement",
    "risk management", "actuarial", "accounting", "audit",
    "valuation", "derivatives", "fixed income", "equities",
  ],
  professionalism: [
    "professionalism", "professional development", "leadership",
    "communication", "client relationship", "mentoring",
    "supervision", "management skills",
  ],
  practice_mgmt: [
    "practice management", "business development", "operations",
    "technology", "cybersecurity", "data protection", "GDPR",
    "office management", "workflow",
  ],
  general: [
    "general", "continuing education", "professional education",
    "conference", "seminar", "workshop", "webinar",
  ],
};

// ---------------------------------------------------------------------------
// Date extraction patterns
// ---------------------------------------------------------------------------

function extractDates(text: string): string[] {
  const dates: string[] = [];

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyPattern = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/g;
  let match: RegExpExecArray | null;
  while ((match = dmyPattern.exec(text)) !== null) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1990 && year <= 2099) {
      dates.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  // YYYY-MM-DD
  const isoPattern = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((match = isoPattern.exec(text)) !== null) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (year >= 1990 && year <= 2099 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      dates.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  // Month DD, YYYY or Month DD YYYY
  const monthNames = "(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
  const namedPattern = new RegExp(`(${monthNames})\\s+(\\d{1,2}),?\\s+(\\d{4})`, "gi");
  while ((match = namedPattern.exec(text)) !== null) {
    const monthStr = match[1];
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const monthIndex = parseMonthName(monthStr);
    if (monthIndex >= 0 && day >= 1 && day <= 31 && year >= 1990 && year <= 2099) {
      dates.push(`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  // DD Month YYYY
  const dayFirstNamedPattern = new RegExp(`(\\d{1,2})\\s+(${monthNames}),?\\s+(\\d{4})`, "gi");
  while ((match = dayFirstNamedPattern.exec(text)) !== null) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2];
    const year = parseInt(match[3], 10);
    const monthIndex = parseMonthName(monthStr);
    if (monthIndex >= 0 && day >= 1 && day <= 31 && year >= 1990 && year <= 2099) {
      dates.push(`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  return dates;
}

function parseMonthName(name: string): number {
  const months: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };
  return months[name.toLowerCase()] ?? -1;
}

// ---------------------------------------------------------------------------
// Hours extraction patterns
// ---------------------------------------------------------------------------

function extractHours(text: string): number | undefined {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:CPD|CPE|CE|continuing education)\s*(?:hours?|credits?|points?)/i,
    /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:of\s+)?(?:CPD|CPE|CE|continuing education|professional development)/i,
    /(?:CPD|CPE|CE)\s*(?:hours?|credits?|points?)\s*:\s*(\d+(?:\.\d+)?)/i,
    /(?:hours?|credits?)\s*(?:earned|awarded|completed|claimed)\s*:\s*(\d+(?:\.\d+)?)/i,
    /(?:total|earned|awarded)\s*:\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|credits?|points?)/i,
    /(\d+(?:\.\d+)?)\s*(?:credits?|points?)\b/i,
    /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const val = parseFloat(match[1]);
      // Sanity check: CPD hours should be between 0.25 and 100
      if (val >= 0.25 && val <= 100) {
        return val;
      }
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Provider extraction
// ---------------------------------------------------------------------------

function extractProvider(text: string): string | undefined {
  // Try structured patterns first (e.g., "Provider: XYZ Corp")
  for (const pattern of PROVIDER_LINE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const value = match[1].trim();
      if (value.length > 0 && value.length <= 200) {
        return value;
      }
    }
  }

  // Try known provider abbreviations
  for (const { pattern, name } of KNOWN_PROVIDERS) {
    if (pattern.test(text)) {
      return name;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Title extraction
// ---------------------------------------------------------------------------

function extractTitle(text: string, fileName: string): string | undefined {
  // From text content: use the first substantial line (not a header/label)
  if (text.length > 0) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      // Skip short or boilerplate lines
      if (line.length < 5) continue;
      if (/^(page|date|provider|issued|hours|credits|total|name|email|phone|address)\s*:/i.test(line)) continue;
      // Use the first meaningful line as the title (cap at 200 chars)
      if (line.length <= 200) {
        return line;
      }
      return line.substring(0, 200);
    }
  }

  // Fall back to filename-based title
  return titleFromFilename(fileName);
}

function titleFromFilename(fileName: string): string | undefined {
  if (!fileName) return undefined;

  // Remove extension
  let name = fileName.replace(/\.[^.]+$/, "");

  // Remove date patterns from the filename
  name = name.replace(/\d{8}_/, "");
  name = name.replace(/\d{4}[-_]\d{2}[-_]\d{2}/, "");

  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]+/g, " ").trim();

  if (name.length < 2) return undefined;

  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ---------------------------------------------------------------------------
// Category detection
// ---------------------------------------------------------------------------

function detectCategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  let bestCategory: string | undefined;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Only return if we found at least one keyword match
  return bestScore > 0 ? bestCategory : undefined;
}

// ---------------------------------------------------------------------------
// Credential matching
// ---------------------------------------------------------------------------

function matchCredential(text: string): string | undefined {
  for (const { pattern, name } of KNOWN_CREDENTIALS) {
    if (pattern.test(text)) {
      return name;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// File content reading
// ---------------------------------------------------------------------------

function readTextContent(filePath: string, fileType: string): string {
  try {
    const buffer = readFileSync(filePath);

    if (fileType === "text") {
      const text = buffer.toString("utf-8");

      // Check if this is a CSV file by looking for comma-separated headers
      const firstLine = text.split(/\r?\n/)[0] ?? "";
      const csvHeaderPattern = /,/;
      const csvColumnPatterns = [
        /\bHours?\b/i,
        /\bCredits?\b/i,
        /\bDate\b/i,
        /\bProvider\b/i,
        /\bCategory\b/i,
      ];

      if (csvHeaderPattern.test(firstLine)) {
        const headerMatchCount = csvColumnPatterns.filter((p) => p.test(firstLine)).length;
        if (headerMatchCount >= 2) {
          // This looks like a CSV - parse rows to extract summary info
          const lines = text.split(/\r?\n/).filter((l) => l.trim());
          const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

          const hoursIdx = headers.findIndex((h) => /^hours?$/i.test(h) || /^credits?$/i.test(h));
          const dateIdx = headers.findIndex((h) => /^date$/i.test(h));

          let totalHours = 0;
          const dates: string[] = [];

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",").map((c) => c.trim());

            if (hoursIdx >= 0 && cols[hoursIdx]) {
              const val = parseFloat(cols[hoursIdx]);
              if (!isNaN(val) && val > 0) {
                totalHours += val;
              }
            }

            if (dateIdx >= 0 && cols[dateIdx]) {
              dates.push(cols[dateIdx]);
            }
          }

          // Append summary info to the text so other extractors can pick it up
          let csvSummary = text;
          if (totalHours > 0) {
            csvSummary += `\nTotal: ${totalHours} hours`;
          }
          if (dates.length > 0) {
            csvSummary += `\nDate range: ${dates[0]} to ${dates[dates.length - 1]}`;
          }
          return csvSummary;
        }
      }

      return text;
    }

    if (fileType === "pdf") {
      // Simple heuristic PDF text extraction:
      // Look for text between BT and ET operators, or extract readable ASCII
      const raw = buffer.toString("latin1");
      const textChunks: string[] = [];

      // Try to extract text from PDF stream objects
      const streamPattern = /stream\r?\n([\s\S]*?)endstream/g;
      let streamMatch: RegExpExecArray | null;
      while ((streamMatch = streamPattern.exec(raw)) !== null) {
        const content = streamMatch[1];
        // Extract readable ASCII text (printable characters)
        const readable = content.replace(/[^\x20-\x7E\r\n]/g, " ").replace(/\s+/g, " ").trim();
        if (readable.length > 3) {
          textChunks.push(readable);
        }
      }

      // Also try to extract text between parentheses in BT/ET blocks (PDF text objects)
      const textObjPattern = /\(([^)]{2,})\)/g;
      let textMatch: RegExpExecArray | null;
      while ((textMatch = textObjPattern.exec(raw)) !== null) {
        const content = textMatch[1].replace(/[^\x20-\x7E]/g, "").trim();
        if (content.length > 2) {
          textChunks.push(content);
        }
      }

      return textChunks.join(" ").substring(0, 10000);
    }

    // For images, return empty (we rely on filename analysis)
    return "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Main extraction function
// ---------------------------------------------------------------------------

export async function extractEvidenceMetadata(
  filePath: string,
  fileType: string,
  fileName: string
): Promise<ExtractedMetadata> {
  const result: ExtractedMetadata = { confidence: 0 };
  let fieldsExtracted = 0;
  const totalPossible = 6; // title, provider, date, hours, category, credentialMatch

  // Read text content from the file
  const textContent = readTextContent(filePath, fileType);

  // Combine text content and filename for analysis
  const combinedText = `${fileName}\n${textContent}`;

  // Extract date
  const dates = extractDates(combinedText);
  if (dates.length > 0) {
    result.date = dates[0];
    fieldsExtracted += 1;
  }

  // Extract hours
  const hours = extractHours(combinedText);
  if (hours !== undefined) {
    result.hours = hours;
    fieldsExtracted += 1;
  }

  // Extract provider
  const provider = extractProvider(combinedText);
  if (provider) {
    result.provider = provider;
    fieldsExtracted += 1;
  }

  // Extract title
  const title = extractTitle(textContent, fileName);
  if (title) {
    result.title = title;
    fieldsExtracted += 1;
  }

  // Detect category
  const category = detectCategory(combinedText);
  if (category) {
    result.category = category;
    fieldsExtracted += 1;
  }

  // Match credential
  const credential = matchCredential(combinedText);
  if (credential) {
    result.credentialMatch = credential;
    fieldsExtracted += 1;
  }

  // Calculate confidence based on extraction success
  // Base confidence from number of fields extracted
  let confidence = fieldsExtracted / totalPossible;

  // Bonus for text-based files (more reliable extraction)
  if (fileType === "text" && textContent.length > 10) {
    confidence = Math.min(1, confidence + 0.1);
  }

  // Penalty for image files (filename-only analysis)
  if (fileType === "image") {
    confidence = confidence * 0.7;
  }

  // Round to 2 decimal places
  result.confidence = Math.round(confidence * 100) / 100;

  return result;
}
