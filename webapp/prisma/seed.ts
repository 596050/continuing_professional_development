import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:dev.db" });
const prisma = new PrismaClient({ adapter });

const credentials = [
  // US - Financial Services
  {
    name: "CFP",
    body: "CFP Board",
    region: "US",
    vertical: "financial_services",
    hoursRequired: 30, // 40h from Q1 2027
    cycleLengthYears: 2,
    ethicsHours: 2,
    structuredHours: null,
    description:
      "Certified Financial Planner - 30h per 2-year cycle (increasing to 40h from Q1 2027). Must include 2h ethics.",
    categoryRules: JSON.stringify({
      categories: ["general", "ethics"],
      ethicsRequired: 2,
      carryoverAllowed: false,
      upcomingChange: {
        effectiveDate: "2027-01-01",
        newHoursRequired: 40,
        note: "CFP Board increasing CE requirement from 30h to 40h per 2-year cycle",
      },
    }),
  },
  {
    name: "FINRA Series",
    body: "FINRA",
    region: "US",
    vertical: "financial_services",
    hoursRequired: null, // Regulatory Element is content-based, not hour-based
    cycleLengthYears: 1,
    ethicsHours: null,
    structuredHours: null,
    description:
      "FINRA Continuing Education - Regulatory Element (annual, content-based) plus Firm Element (firm-defined annually).",
    categoryRules: JSON.stringify({
      categories: ["regulatory_element", "firm_element"],
      regulatoryElementRequired: true,
      firmElementRequired: true,
      deadline: "December 31",
      note: "Regulatory Element is assigned content. Firm Element is defined by employing firm.",
    }),
  },
  {
    name: "IAR",
    body: "NASAA",
    region: "US",
    vertical: "financial_services",
    hoursRequired: 12,
    cycleLengthYears: 1,
    ethicsHours: 6,
    structuredHours: 6,
    description:
      "Investment Adviser Representative - 12 credits/year (6 Ethics + 6 Products & Practice). State adoption is rolling.",
    categoryRules: JSON.stringify({
      categories: ["ethics", "products_and_practice"],
      ethicsRequired: 6,
      productsAndPracticeRequired: 6,
      stateAdoptionVaries: true,
      deadline: "December 31",
    }),
  },
  // UK - Financial Services
  {
    name: "FCA Adviser",
    body: "FCA",
    region: "GB",
    vertical: "financial_services",
    hoursRequired: 35,
    cycleLengthYears: 1,
    ethicsHours: null,
    structuredHours: 21,
    description:
      "FCA-regulated retail investment adviser - 35h/year minimum, of which 21h must be structured CPD.",
    categoryRules: JSON.stringify({
      categories: ["structured", "unstructured"],
      structuredRequired: 21,
      unstructuredMax: 14,
      retailInvestmentOnly: true,
      note: "T&C sourcebook requirement. Insurance distribution may have separate rules (PS25/21).",
    }),
  },
  {
    name: "CII/PFS",
    body: "Chartered Insurance Institute",
    region: "GB",
    vertical: "financial_services",
    hoursRequired: 35,
    cycleLengthYears: 1,
    ethicsHours: null,
    structuredHours: 21,
    description:
      "CII/PFS member CPD - 35h/year (21h structured). 10% random sampling audit by CII.",
    categoryRules: JSON.stringify({
      categories: ["structured", "unstructured"],
      structuredRequired: 21,
      auditRisk: "10% random sampling",
      membershipGrades: ["Cert CII", "Dip CII", "APFS", "Chartered"],
    }),
  },
  {
    name: "CISI",
    body: "Chartered Institute for Securities & Investment",
    region: "GB",
    vertical: "financial_services",
    hoursRequired: 35,
    cycleLengthYears: 1,
    ethicsHours: 3.5,
    structuredHours: 21,
    description:
      "CISI member CPD - 35h/year for Chartered members (10h for standard). 10% ethics. 21h structured.",
    categoryRules: JSON.stringify({
      categories: ["structured", "unstructured", "ethics"],
      structuredRequired: 21,
      ethicsRequired: 3.5,
      membershipGrades: [
        { grade: "Standard", hoursRequired: 10 },
        { grade: "Chartered", hoursRequired: 35 },
        { grade: "SPS", hoursRequired: 35 },
      ],
    }),
  },
  // Australia
  {
    name: "FASEA/ASIC",
    body: "ASIC (formerly FASEA)",
    region: "AU",
    vertical: "financial_services",
    hoursRequired: 40,
    cycleLengthYears: 1,
    ethicsHours: null,
    structuredHours: null,
    description:
      "Australian financial adviser CPD - 40h/year under ASIC standards (formerly FASEA).",
    categoryRules: JSON.stringify({
      categories: [
        "technical_competence",
        "client_care",
        "regulatory_compliance",
        "professionalism_ethics",
      ],
      note: "Must cover all four knowledge areas. Minimum hours per area not specified but all must be addressed.",
    }),
  },
  // Canada
  {
    name: "FP Canada CFP",
    body: "FP Canada",
    region: "CA",
    vertical: "financial_services",
    hoursRequired: 25,
    cycleLengthYears: 1,
    ethicsHours: null,
    structuredHours: null,
    description:
      "FP Canada CFP certification - 25 CE credits/year.",
    categoryRules: JSON.stringify({
      categories: [
        "financial_planning",
        "professional_responsibility",
        "practice_management",
      ],
      professionalResponsibilityRequired: 1,
      note: "At least 1 credit must be in Professional Responsibility.",
    }),
  },
  {
    name: "FP Canada QAFP",
    body: "FP Canada",
    region: "CA",
    vertical: "financial_services",
    hoursRequired: 12,
    cycleLengthYears: 1,
    ethicsHours: null,
    structuredHours: null,
    description:
      "FP Canada QAFP certification - 12 CE credits/year.",
    categoryRules: JSON.stringify({
      categories: [
        "financial_planning",
        "professional_responsibility",
        "practice_management",
      ],
      professionalResponsibilityRequired: 1,
    }),
  },
  // Singapore
  {
    name: "MAS Licensed Rep",
    body: "MAS",
    region: "SG",
    vertical: "financial_services",
    hoursRequired: 30,
    cycleLengthYears: 1,
    ethicsHours: 6,
    structuredHours: 8,
    description:
      "MAS-licensed financial adviser representative - 30h/year (6h ethics + 8h rules & regulations).",
    categoryRules: JSON.stringify({
      categories: ["ethics", "rules_and_regulations", "general"],
      ethicsRequired: 6,
      rulesAndRegsRequired: 8,
      generalMinimum: 16,
    }),
  },
  // Hong Kong
  {
    name: "SFC Licensed Rep",
    body: "SFC",
    region: "HK",
    vertical: "financial_services",
    hoursRequired: 10,
    cycleLengthYears: 1,
    ethicsHours: 2,
    structuredHours: 5,
    description:
      "SFC-licensed representative - 10 CPT hours/year (12h for Responsible Officers). 5h must be from approved courses.",
    categoryRules: JSON.stringify({
      categories: ["approved_courses", "non_approved", "ethics"],
      approvedCoursesRequired: 5,
      ethicsRequired: 2,
      responsibleOfficerHours: 12,
      note: "Responsible Officers need 12h/year instead of 10h.",
    }),
  },
  // UK - Health
  {
    name: "NMC Nurse/Midwife",
    body: "NMC",
    region: "GB",
    vertical: "health",
    hoursRequired: 35,
    cycleLengthYears: 3,
    ethicsHours: null,
    structuredHours: null,
    description:
      "NMC revalidation - 35h CPD over 3 years, of which 20h must be participatory.",
    categoryRules: JSON.stringify({
      categories: ["participatory", "non_participatory"],
      participatoryRequired: 20,
      additionalRequirements: [
        "5 pieces of practice-related feedback",
        "5 written reflective accounts",
        "Reflective discussion with confirmer",
        "Health and character declaration",
        "Professional indemnity arrangement",
      ],
    }),
  },
  // UK - Chartered Accountancy
  {
    name: "ACCA",
    body: "ACCA",
    region: "INTL",
    vertical: "chartered_accounting",
    hoursRequired: 40,
    cycleLengthYears: 1,
    ethicsHours: null,
    structuredHours: 21,
    description:
      "ACCA - 40 units/year (21 verifiable, 19 non-verifiable). Annual declaration by January 1.",
    categoryRules: JSON.stringify({
      categories: ["verifiable", "non_verifiable"],
      verifiableRequired: 21,
      nonVerifiableMax: 19,
      declarationDeadline: "January 1",
      note: "Approved Employer route may have different requirements.",
    }),
  },
  {
    name: "ICAEW",
    body: "ICAEW",
    region: "GB",
    vertical: "chartered_accounting",
    hoursRequired: null, // Outcome-based, no fixed hours
    cycleLengthYears: 1,
    ethicsHours: null,
    structuredHours: null,
    description:
      "ICAEW - outcome-based CPD across 6 practice categories. No fixed hour requirement but must demonstrate competence.",
    categoryRules: JSON.stringify({
      categories: [
        "ethics",
        "technical",
        "business_skills",
        "personal_effectiveness",
        "practice_management",
        "industry_sector",
      ],
      outcomeBased: true,
      note: "Must demonstrate CPD across relevant categories for your practice area.",
    }),
  },
];

async function main() {
  console.log("Seeding credential database...");

  for (const cred of credentials) {
    await prisma.credential.upsert({
      where: { name: cred.name },
      update: cred,
      create: cred,
    });
    console.log(`  Seeded: ${cred.name} (${cred.body}, ${cred.region})`);
  }

  console.log(`\nSeeded ${credentials.length} credentials.`);

  // Seed transcript sources (PRD-002)
  const transcriptSources = [
    { code: "FINPRO_IAR_CE", name: "FinPro IAR CE Transcript", format: "csv" },
    { code: "CFP_BOARD", name: "CFP Board CE Summary", format: "pdf" },
    { code: "SIRCON_CE", name: "Sircon/Vertafore Insurance CE Transcript", format: "csv" },
    { code: "CE_BROKER", name: "CE Broker Transcript Export", format: "csv" },
    { code: "CME_PASSPORT", name: "CME Passport Transcript", format: "csv" },
    { code: "NABP_CPE", name: "NABP CPE Monitor Transcript", format: "csv" },
  ];

  for (const src of transcriptSources) {
    await prisma.externalTranscriptSource.upsert({
      where: { code: src.code },
      update: src,
      create: src,
    });
    console.log(`  Seeded source: ${src.code}`);
  }
  console.log(`\nSeeded ${transcriptSources.length} transcript sources.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
