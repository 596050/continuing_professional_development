/**
 * CPD/CE Crawl Source Specification
 *
 * Comprehensive URL list for Crawlee + Playwright web crawler.
 * Targets regulatory body pages and CPD provider hubs across
 * financial services, health, engineering, legal, and chartered
 * professional verticals.
 *
 * Generated: 2026-01-31
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CrawlFrequency = "daily" | "weekly" | "monthly";

export interface CrawlTarget {
  /** URL to crawl */
  url: string;
  /** Human-readable label for this page */
  label: string;
  /** What data to extract from this page */
  extractionNotes: string;
  /** How often to crawl this target */
  frequency: CrawlFrequency;
}

export interface CrawlSource {
  /** Short identifier used in storage keys and logs */
  id: string;
  /** Full organization name */
  organization: string;
  /** Country or region code (ISO 3166-1 alpha-2, or "INTL") */
  region: string;
  /** Vertical grouping */
  vertical:
    | "financial_services"
    | "health"
    | "engineering"
    | "legal"
    | "chartered_accounting"
    | "market_participant_cpd_hub";
  /** The primary credential(s) this source governs */
  credentials: string[];
  /** Base domain for robots.txt / rate-limit scoping */
  baseDomain: string;
  /** Individual pages to crawl */
  targets: CrawlTarget[];
}

// ---------------------------------------------------------------------------
// Financial Services - US
// ---------------------------------------------------------------------------

const cfpBoard: CrawlSource = {
  id: "cfp-board",
  organization: "CFP Board",
  region: "US",
  vertical: "financial_services",
  credentials: ["CFP"],
  baseDomain: "cfp.net",
  targets: [
    {
      url: "https://www.cfp.net/for-cfp-pros/continuing-education",
      label: "CE landing page",
      extractionNotes:
        "Overview of CE programme, links to sub-pages, any banner announcements about rule changes",
      frequency: "weekly",
    },
    {
      url: "https://www.cfp.net/career-and-growth/continuing-education/continuing-education-requirements",
      label: "CE requirements detail",
      extractionNotes:
        "Current CE hours (30h per 2-year cycle), ethics requirement (2h), category breakdowns, reporting period rules",
      frequency: "weekly",
    },
    {
      url: "https://www.cfp.net/for-cfp-pros/continuing-education/continuing-education-requirements/ce-policies",
      label: "CE policies",
      extractionNotes:
        "Detailed policy rules: carryover, pro bono, topic-specific CE, exemptions, part-time provisions",
      frequency: "monthly",
    },
    {
      url: "https://www.cfp.net/for-cfp-pros/continuing-education/faqs",
      label: "CE FAQs",
      extractionNotes:
        "Frequently asked questions and answers about CE compliance, common edge cases",
      frequency: "monthly",
    },
    {
      url: "https://www.cfp.net/for-cfp-pros/continuing-education/renewal/renewal-policies",
      label: "Renewal policies",
      extractionNotes:
        "Renewal deadlines, late renewal fees, reinstatement procedures",
      frequency: "monthly",
    },
    {
      url: "https://www.cfp.net/news",
      label: "News and announcements",
      extractionNotes:
        "Press releases about CE rule changes (especially the proposed 40h increase), competency standard updates, public comment periods",
      frequency: "daily",
    },
  ],
};

const finra: CrawlSource = {
  id: "finra",
  organization: "FINRA",
  region: "US",
  vertical: "financial_services",
  credentials: ["Series 7", "Series 66", "Series 63", "Series 65"],
  baseDomain: "finra.org",
  targets: [
    {
      url: "https://www.finra.org/registration-exams-ce/continuing-education",
      label: "CE main page",
      extractionNotes:
        "Overview of Regulatory Element and Firm Element, annual deadline (Dec 31), links to current year topics",
      frequency: "weekly",
    },
    {
      url: "https://www.finra.org/registration-exams-ce/continuing-education/regulatory-element-topics",
      label: "Regulatory Element learning plan topics",
      extractionNotes:
        "Current year and upcoming year RE topics by registration category, course descriptions",
      frequency: "weekly",
    },
    {
      url: "https://www.finra.org/rules-guidance/rulebooks/finra-rules/1240",
      label: "FINRA Rule 1240 (CE rule text)",
      extractionNotes:
        "Full rule text for CE requirements, any amendments or proposed amendments",
      frequency: "monthly",
    },
    {
      url: "https://www.finra.org/rules-guidance/notices",
      label: "FINRA Notices index",
      extractionNotes:
        "Regulatory notices and information notices related to CE programme changes, new topic announcements",
      frequency: "daily",
    },
  ],
};

const nasaa: CrawlSource = {
  id: "nasaa",
  organization: "NASAA (North American Securities Administrators Association)",
  region: "US",
  vertical: "financial_services",
  credentials: ["IAR"],
  baseDomain: "nasaa.org",
  targets: [
    {
      url: "https://www.nasaa.org/industry-resources/investment-advisers/investment-adviser-representative-continuing-education/",
      label: "IAR CE programme landing page",
      extractionNotes:
        "Programme overview, 12 credits/year (6 Ethics + 6 Products & Practice), model rule summary",
      frequency: "weekly",
    },
    {
      url: "https://www.nasaa.org/industry-resources/investment-advisers/investment-adviser-representative-continuing-education/member-adoption/",
      label: "IAR CE state adoption list",
      extractionNotes:
        "Table of states that have adopted the model rule, effective dates, pending adoptions. Critical for state-by-state tracking.",
      frequency: "weekly",
    },
    {
      url: "https://www.nasaa.org/industry-resources/investment-advisers/investment-adviser-representative-continuing-education/iar-ce-map/",
      label: "IAR CE interactive map",
      extractionNotes:
        "Visual map of state adoption status, may contain data not in the table version",
      frequency: "weekly",
    },
    {
      url: "https://www.nasaa.org/industry-resources/investment-advisers/investment-adviser-representative-continuing-education/iarce-requirements-overview/",
      label: "IAR CE requirements overview",
      extractionNotes:
        "Detailed requirements: credit types, deficiency rules, reporting, FINRA cross-credit policy",
      frequency: "monthly",
    },
    {
      url: "https://www.nasaa.org/industry-resources/investment-advisers/resources/iar-ce-faq/",
      label: "IAR CE FAQ",
      extractionNotes:
        "Detailed Q&A on compliance edge cases, deficiency accumulation, registration withdrawal impact",
      frequency: "monthly",
    },
    {
      url: "https://www.nasaa.org/industry-resources/approved-iar-ce-providers/",
      label: "Approved IAR CE providers",
      extractionNotes:
        "List of approved CE providers with links, useful for course catalogue integration",
      frequency: "monthly",
    },
  ],
};

// ---------------------------------------------------------------------------
// Financial Services - UK
// ---------------------------------------------------------------------------

const fca: CrawlSource = {
  id: "fca",
  organization: "Financial Conduct Authority",
  region: "GB",
  vertical: "financial_services",
  credentials: ["RIA (UK)", "Mortgage Adviser", "Insurance Distributor"],
  baseDomain: "fca.org.uk",
  targets: [
    {
      url: "https://www.fca.org.uk/firms/training-competence",
      label: "Training and Competence overview",
      extractionNotes:
        "T&C regime overview, competent employees rule, links to TC sourcebook and qualification requirements",
      frequency: "weekly",
    },
    {
      url: "https://www.fca.org.uk/firms/professional-standards-advisers",
      label: "Professional standards for advisers",
      extractionNotes:
        "35h/year CPD (21 structured) for retail investment advisers, SPS requirement, accredited body obligations",
      frequency: "weekly",
    },
    {
      url: "https://handbook.fca.org.uk/handbook/TC/2/1.html",
      label: "TC Sourcebook 2.1 - Assessing and maintaining competence",
      extractionNotes:
        "Detailed rules on CPD requirements, qualification maintenance, insurance distribution 15h requirement status",
      frequency: "monthly",
    },
    {
      url: "https://www.fca.org.uk/news",
      label: "FCA news and press releases",
      extractionNotes:
        "Policy statements, consultation papers and final rules affecting CPD and T&C (e.g. PS25/21 insurance rules simplification)",
      frequency: "daily",
    },
    {
      url: "https://www.fca.org.uk/publications/policy-statements",
      label: "FCA policy statements index",
      extractionNotes:
        "New policy statements that may change CPD or competence requirements",
      frequency: "daily",
    },
  ],
};

const cii: CrawlSource = {
  id: "cii-pfs",
  organization: "Chartered Insurance Institute / Personal Finance Society",
  region: "GB",
  vertical: "financial_services",
  credentials: [
    "Cert CII",
    "Dip CII",
    "ACII",
    "Chartered Financial Planner",
    "Chartered Insurer",
  ],
  baseDomain: "cii.co.uk",
  targets: [
    {
      url: "https://www.cii.co.uk/learning/cpd/",
      label: "CPD landing page",
      extractionNotes:
        "Overview of CII CPD scheme, links to scheme rules, recording tools, accreditation info",
      frequency: "weekly",
    },
    {
      url: "https://www.cii.co.uk/learning/cpd/cpd-scheme-rules/",
      label: "CPD scheme rules",
      extractionNotes:
        "35h/year requirement (21 structured), minimum activity duration (30 min), part-time rules, exemptions, retired members policy",
      frequency: "monthly",
    },
    {
      url: "https://www.cii.co.uk/news-insight/insight/articles/cii-statement-on-fca-s-cpd-consultation-decisions/0d823db1-a49b-43b5-af85-7cde858430ec",
      label: "CII statement on FCA CPD consultation",
      extractionNotes:
        "CII response to FCA removing mandatory insurance CPD hours, confirmation CII 35h requirement continues",
      frequency: "monthly",
    },
    {
      url: "https://www.cii.co.uk/learning/accreditation/companies/cpd-accreditation/",
      label: "CPD accreditation for providers",
      extractionNotes:
        "How CPD providers obtain CII accreditation, criteria, process",
      frequency: "monthly",
    },
    {
      url: "https://www.cii.co.uk/news-insight/",
      label: "CII news and insight",
      extractionNotes:
        "Announcements about CPD scheme changes, new qualifications, policy positions",
      frequency: "daily",
    },
  ],
};

const cisi: CrawlSource = {
  id: "cisi",
  organization: "Chartered Institute for Securities & Investment",
  region: "GB",
  vertical: "financial_services",
  credentials: ["CISI member grades", "Chartered Wealth Manager", "CFP (UK)"],
  baseDomain: "cisi.org",
  targets: [
    {
      url: "https://www.cisi.org/cisiweb2/cisi-website/cpd/what-is-cpd/cpd-opportunities-with-the-cisi",
      label: "CPD opportunities",
      extractionNotes:
        "Overview of CPD resources, Professional Refresher modules, e-learning, events",
      frequency: "weekly",
    },
    {
      url: "https://www.cisi.org/cisiweb2/docs/default-source/cisi-website/membership/cpd-policy-sept-2022-final-.pdf",
      label: "CPD policy document (PDF)",
      extractionNotes:
        "Full CPD policy: 10h/year standard members (6 structured, 1h ethics), 35h/year chartered/SPS (21 structured, 10% ethics)",
      frequency: "monthly",
    },
    {
      url: "https://www.cisi.org/cisiweb2/docs/default-source/cisi-website/membership/cpd-requirements.pdf",
      label: "CPD requirements summary (PDF)",
      extractionNotes:
        "Condensed requirements by membership grade, structured vs unstructured definitions",
      frequency: "monthly",
    },
    {
      url: "https://www.cisi.org/cisiweb2/docs/default-source/cisi-website/membership/cpd_queries_and_appeals_process.pdf",
      label: "CPD queries and appeals process (PDF)",
      extractionNotes:
        "Non-compliance procedures, appeals mechanism, remediation requirements",
      frequency: "monthly",
    },
  ],
};

// ---------------------------------------------------------------------------
// Financial Services - International (AU, CA, SG, HK)
// ---------------------------------------------------------------------------

const asic: CrawlSource = {
  id: "asic-fasea",
  organization: "ASIC (formerly FASEA)",
  region: "AU",
  vertical: "financial_services",
  credentials: ["Australian Financial Adviser"],
  baseDomain: "asic.gov.au",
  targets: [
    {
      url: "https://www.asic.gov.au/regulatory-resources/financial-services/financial-advice/professional-standards/continuing-professional-development-cpd/",
      label: "CPD requirements page",
      extractionNotes:
        "40h/year minimum (36h part-time with consent), 70% qualifying activities, mandatory categories, tax advice additional 5h, record-keeping obligations",
      frequency: "weekly",
    },
    {
      url: "https://www.asic.gov.au/regulatory-resources/financial-services/financial-advice/professional-standards/",
      label: "Professional standards overview",
      extractionNotes:
        "Education deadline (1 Jan 2026), experienced provider pathway, qualification requirements",
      frequency: "weekly",
    },
    {
      url: "https://www.asic.gov.au/about-asic/news-centre/news-items/asic-acts-against-financial-advisers-for-failing-to-meet-continuing-professional-development-cpd-requirements",
      label: "ASIC enforcement on CPD non-compliance",
      extractionNotes:
        "Enforcement actions and outcomes for CPD failures, deterrent messaging, panel decisions",
      frequency: "monthly",
    },
    {
      url: "https://www.asic.gov.au/about-asic/news-centre/",
      label: "ASIC news centre",
      extractionNotes:
        "Media releases and news items related to financial adviser CPD, education standards, enforcement",
      frequency: "daily",
    },
  ],
};

const fpCanada: CrawlSource = {
  id: "fp-canada",
  organization: "FP Canada",
  region: "CA",
  vertical: "financial_services",
  credentials: ["CFP (Canada)", "QAFP"],
  baseDomain: "fpcanada.ca",
  targets: [
    {
      url: "https://www.fpcanada.ca/career/continuing-education",
      label: "CE landing page",
      extractionNotes:
        "Overview of CE programme for CFP and QAFP professionals",
      frequency: "weekly",
    },
    {
      url: "https://www.fpcanada.ca/career/continuing-education/continuing-education-requirements",
      label: "CE requirements detail",
      extractionNotes:
        "CFP: 25h/year (12h Financial Planning, 2h Professional Responsibility, 11h General). QAFP: 12h/year (1h Professional Responsibility). Pre-accreditation rules effective Jan 2025. Giving Back sub-category (max 5h).",
      frequency: "weekly",
    },
    {
      url: "https://www.fpcanada.ca/career/continuing-education/ce-requirements",
      label: "CE requirements summary",
      extractionNotes:
        "Simplified view of CE category requirements, renewal timeline (April 1 to March 31)",
      frequency: "monthly",
    },
    {
      url: "https://www.fpcanada.ca/continuing-education-providers",
      label: "CE providers list",
      extractionNotes:
        "Approved CE providers for course catalogue integration",
      frequency: "monthly",
    },
  ],
};

const mas: CrawlSource = {
  id: "mas-singapore",
  organization: "Monetary Authority of Singapore",
  region: "SG",
  vertical: "financial_services",
  credentials: ["FAA Representative", "SFA Representative"],
  baseDomain: "mas.gov.sg",
  targets: [
    {
      url: "https://www.mas.gov.sg/regulation/notices/notice-faa-n26",
      label: "Notice FAA-N26 (CPD requirements)",
      extractionNotes:
        "Full notice on competency requirements including CPD for representatives of financial advisers, minimum CPD hours, structured CPD, IBF certification cross-credit",
      frequency: "monthly",
    },
    {
      url: "https://www.mas.gov.sg/regulation/notices/notice-502",
      label: "Notice 502 (Insurance brokers CPD)",
      extractionNotes:
        "Minimum standards and CPD for insurance brokers and broking staff",
      frequency: "monthly",
    },
    {
      url: "https://www.mas.gov.sg/publications/consultations",
      label: "MAS consultations",
      extractionNotes:
        "Consultation papers on competency and CPD requirement reviews",
      frequency: "weekly",
    },
    {
      url: "https://www.mas.gov.sg/news",
      label: "MAS news",
      extractionNotes:
        "Announcements about regulatory changes affecting representative CPD requirements",
      frequency: "daily",
    },
  ],
};

const sfc: CrawlSource = {
  id: "sfc-hk",
  organization: "Securities and Futures Commission (Hong Kong)",
  region: "HK",
  vertical: "financial_services",
  credentials: ["Licensed Representative (HK)", "Responsible Officer (HK)"],
  baseDomain: "sfc.hk",
  targets: [
    {
      url: "https://www.sfc.hk/en/Regulatory-functions/Intermediaries/Licensing/Ongoing-obligations",
      label: "Ongoing obligations for intermediaries",
      extractionNotes:
        "Overview of CPT (Continuous Professional Training) obligation, 10 CPT hours/year, 5h relevant to regulated activities, sponsor/takeover additional 2.5h",
      frequency: "weekly",
    },
    {
      url: "https://www.sfc.hk/en/rules-and-standards/codes-and-guidelines/guidelines/guidelines-on-continuous-professional-training",
      label: "Guidelines on CPT",
      extractionNotes:
        "Full guideline document: who it applies to, hour requirements, exemptions, record-keeping (3 years), re-entry requirements",
      frequency: "monthly",
    },
    {
      url: "https://www.sfc.hk/en/Regulatory-functions/Intermediaries/Licensing/Competence-requirements-for-individuals",
      label: "Competence requirements FAQ",
      extractionNotes:
        "FAQ on competence requirements for licensed individuals, CPT compliance questions",
      frequency: "monthly",
    },
    {
      url: "https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Guidelines/licensing-handbook",
      label: "Licensing Handbook",
      extractionNotes:
        "Comprehensive licensing handbook with CPT provisions",
      frequency: "monthly",
    },
  ],
};

// ---------------------------------------------------------------------------
// Health Professions
// ---------------------------------------------------------------------------

const nmc: CrawlSource = {
  id: "nmc",
  organization: "Nursing and Midwifery Council",
  region: "GB",
  vertical: "health",
  credentials: ["Registered Nurse", "Registered Midwife", "Nursing Associate"],
  baseDomain: "nmc.org.uk",
  targets: [
    {
      url: "https://www.nmc.org.uk/revalidation/requirements/cpd/",
      label: "CPD requirements",
      extractionNotes:
        "35h CPD per 3-year revalidation period, 20h participatory, recording requirements, no prescribed activity types",
      frequency: "weekly",
    },
    {
      url: "http://revalidation.nmc.org.uk/welcome-to-revalidation/index.html",
      label: "Revalidation microsite",
      extractionNotes:
        "Full revalidation process overview: CPD, practice hours, feedback, reflective accounts, confirmation, health and character declaration",
      frequency: "weekly",
    },
    {
      url: "https://www.nmc.org.uk/globalassets/sitedocuments/revalidation/how-to-revalidate-booklet.pdf",
      label: "How to revalidate booklet (PDF)",
      extractionNotes:
        "Complete guide to revalidation requirements and evidence gathering",
      frequency: "monthly",
    },
    {
      url: "https://www.nmc.org.uk/globalassets/sitedocuments/revalidation/examples-of-cpd-activities-guidance-sheet.pdf",
      label: "Examples of CPD activities (PDF)",
      extractionNotes:
        "Guidance on what counts as CPD and participatory learning, examples for different roles",
      frequency: "monthly",
    },
    {
      url: "https://www.nmc.org.uk/news/",
      label: "NMC news",
      extractionNotes:
        "Announcements about revalidation or CPD requirement changes",
      frequency: "daily",
    },
  ],
};

const gmc: CrawlSource = {
  id: "gmc",
  organization: "General Medical Council",
  region: "GB",
  vertical: "health",
  credentials: ["Doctor (UK)"],
  baseDomain: "gmc-uk.org",
  targets: [
    {
      url: "https://www.gmc-uk.org/education/standards-guidance-and-curricula/guidance/continuing-professional-development",
      label: "CPD guidance for doctors",
      extractionNotes:
        "CPD principles, no mandated hours/points, tailored to scope of practice, appraisal-linked",
      frequency: "weekly",
    },
    {
      url: "https://www.gmc-uk.org/registration-and-licensing/managing-your-registration/revalidation/guidance-on-supporting-information-for-revalidation/continuing-professional-development",
      label: "Supporting information for revalidation - CPD",
      extractionNotes:
        "CPD as supporting information for revalidation, six types of evidence, collection frequency, appraisal discussion",
      frequency: "weekly",
    },
    {
      url: "https://www.gmc-uk.org/registration-and-licensing/managing-your-registration/revalidation/guidance-on-supporting-information-for-appraisal-and-revalidation/your-supporting-information---continuing-professional-development",
      label: "Revalidation supporting information detail",
      extractionNotes:
        "Detailed requirements for CPD evidence including what is expected at appraisal",
      frequency: "monthly",
    },
    {
      url: "https://www.gmc-uk.org/-/media/documents/cpd-guidance-for-all-doctors-0316_pdf-56438625.pdf",
      label: "CPD guidance PDF",
      extractionNotes:
        "Full CPD guidance document for all doctors",
      frequency: "monthly",
    },
    {
      url: "https://www.gmc-uk.org/news",
      label: "GMC news",
      extractionNotes:
        "Updates on revalidation, CPD guidance changes, policy announcements",
      frequency: "daily",
    },
  ],
};

const gphc: CrawlSource = {
  id: "gphc",
  organization: "General Pharmaceutical Council",
  region: "GB",
  vertical: "health",
  credentials: ["Pharmacist", "Pharmacy Technician"],
  baseDomain: "pharmacyregulation.org",
  targets: [
    {
      url: "https://www.pharmacyregulation.org/pharmacists/revalidation-renewal",
      label: "Revalidation and renewal",
      extractionNotes:
        "Annual revalidation: 4 CPD records (min 2 planned), peer discussion, reflective account. Review criteria.",
      frequency: "weekly",
    },
    {
      url: "https://www.pharmacyregulation.org/pharmacists/revalidation-renewal/revalidation-resources",
      label: "Revalidation resources",
      extractionNotes:
        "Templates, worked examples, guidance for completing revalidation records",
      frequency: "monthly",
    },
    {
      url: "https://www.pharmacyregulation.org/pharmacists/revalidation-renewal/revalidation-resources/revalidation-faqs",
      label: "Revalidation FAQs",
      extractionNotes:
        "Detailed Q&A on revalidation requirements, breaks in practice, extensions, review process",
      frequency: "monthly",
    },
    {
      url: "https://www.pharmacyregulation.org/about-us/news-and-updates/standards-reflective-account-set-2026",
      label: "2026 reflective account standards",
      extractionNotes:
        "From Jan 2026: pharmacists can select any of the nine standards for reflective account (changed from three designated per year)",
      frequency: "monthly",
    },
    {
      url: "https://www.pharmacyregulation.org/about-us/news-and-updates",
      label: "GPhC news and updates",
      extractionNotes:
        "Announcements about revalidation changes, new standards, CPD framework updates",
      frequency: "daily",
    },
  ],
};

const hcpc: CrawlSource = {
  id: "hcpc",
  organization: "Health and Care Professions Council",
  region: "GB",
  vertical: "health",
  credentials: [
    "Physiotherapist",
    "Occupational Therapist",
    "Paramedic",
    "Radiographer",
    "Speech Therapist",
    "Dietitian",
    "Biomedical Scientist",
    "Operating Department Practitioner",
    "Other HCPC registrants",
  ],
  baseDomain: "hcpc-uk.org",
  targets: [
    {
      url: "https://www.hcpc-uk.org/cpd/",
      label: "CPD landing page",
      extractionNotes:
        "CPD overview: no minimum hours/points, mixture of activity types required, audit-based compliance",
      frequency: "weekly",
    },
    {
      url: "https://www.hcpc-uk.org/cpd/our-cpd-requirements/",
      label: "CPD requirements",
      extractionNotes:
        "CPD standards: mixture of learning types, relevance to practice, impact on service users, continuous engagement",
      frequency: "weekly",
    },
    {
      url: "https://www.hcpc-uk.org/cpd/cpd-audits/",
      label: "CPD audit process",
      extractionNotes:
        "Random 2.5% audit selection, profile submission requirements, 3-month window, deferral process",
      frequency: "monthly",
    },
    {
      url: "https://www.hcpc-uk.org/cpd/cpd-audits/being-selected-for-audit/",
      label: "Being selected for audit",
      extractionNotes:
        "What happens when selected, timeline, evidence requirements, notification process",
      frequency: "monthly",
    },
    {
      url: "https://www.hcpc-uk.org/cpd/cpd-resources/",
      label: "CPD resources",
      extractionNotes:
        "Templates, guidance documents, links to support materials for CPD recording",
      frequency: "monthly",
    },
    {
      url: "https://www.hcpc-uk.org/cpd/data/cpd/",
      label: "CPD audit data",
      extractionNotes:
        "Published audit pass/fail rates by profession, useful for product messaging",
      frequency: "monthly",
    },
    {
      url: "https://www.hcpc-uk.org/globalassets/resources/guidance/continuing-professional-development-and-your-registration.pdf",
      label: "CPD and your registration guidance (PDF)",
      extractionNotes:
        "Comprehensive guidance document on CPD requirements, profile writing, and audit preparation",
      frequency: "monthly",
    },
  ],
};

// ---------------------------------------------------------------------------
// Engineering
// ---------------------------------------------------------------------------

const engCouncil: CrawlSource = {
  id: "eng-council",
  organization: "Engineering Council",
  region: "GB",
  vertical: "engineering",
  credentials: ["CEng", "IEng", "EngTech", "ICTTech"],
  baseDomain: "engc.org.uk",
  targets: [
    {
      url: "https://www.engc.org.uk/resources-and-guidance/professional-development/continuing-professional-development-cpd",
      label: "CPD main page",
      extractionNotes:
        "CPD recording is mandatory for registered engineers, no minimum hours specified, competence-based approach, risk of removal for persistent non-engagement",
      frequency: "weekly",
    },
    {
      url: "https://www.engc.org.uk/media/1lupucbv/cpd-policy-statement.pdf",
      label: "CPD policy statement (PDF)",
      extractionNotes:
        "Full CPD policy: code for registrants, obligations, recording requirements, sampling process",
      frequency: "monthly",
    },
    {
      url: "https://www.engc.org.uk/professional-development/mycareerpath/",
      label: "mycareerpath recording tool",
      extractionNotes:
        "Description of the Engineering Council CPD recording platform, features, adoption by PEIs",
      frequency: "monthly",
    },
    {
      url: "https://www.engc.org.uk/media/40uft4ob/guide-to-professional-registration.pdf",
      label: "Guide to professional registration (PDF)",
      extractionNotes:
        "CPD commitment as condition of registration, UK-SPEC requirements",
      frequency: "monthly",
    },
  ],
};

const iet: CrawlSource = {
  id: "iet",
  organization: "Institution of Engineering and Technology",
  region: "GB",
  vertical: "engineering",
  credentials: ["IET Member", "CEng (via IET)", "IEng (via IET)"],
  baseDomain: "theiet.org",
  targets: [
    {
      url: "https://www.theiet.org/career/professional-development/continuing-professional-development/what-is-cpd/",
      label: "What is CPD",
      extractionNotes:
        "CPD overview: 30h/year recommended, TWAVES framework (Training, Work experience, Academic study, Volunteering, Events, Self-Study)",
      frequency: "weekly",
    },
    {
      url: "https://www.theiet.org/career/professional-development/continuing-professional-development/policy-on-cpd/",
      label: "Policy on CPD",
      extractionNotes:
        "30h/year minimum for professionally active members, 10h for less active, mandatory recording commitment",
      frequency: "monthly",
    },
    {
      url: "https://www.theiet.org/career/professional-development/continuing-professional-development/mandatory-cpd-audit",
      label: "Mandatory CPD audit",
      extractionNotes:
        "Random audit from 2017, volunteer CPD Advisors review records, audit process and criteria",
      frequency: "monthly",
    },
    {
      url: "https://www.theiet.org/media/2876/cpd-brochure.pdf",
      label: "CPD brochure (PDF)",
      extractionNotes:
        "Comprehensive guide to IET CPD requirements, recording tips, activity examples",
      frequency: "monthly",
    },
  ],
};

const ice: CrawlSource = {
  id: "ice",
  organization: "Institution of Civil Engineers",
  region: "GB",
  vertical: "engineering",
  credentials: ["MICE", "FICE", "CEng (via ICE)", "IEng (via ICE)"],
  baseDomain: "ice.org.uk",
  targets: [
    {
      url: "https://www.ice.org.uk/membership/my-membership/continuing-professional-development-requirements",
      label: "CPD requirements",
      extractionNotes:
        "No minimum hours, competence-based approach, written record required, annual audit with removal risk for non-submission",
      frequency: "weekly",
    },
    {
      url: "https://www.ice.org.uk/your-career/continuing-professional-development/cpd-framework",
      label: "CPD framework",
      extractionNotes:
        "Themes and recommended learning content developed by ICE Professionalism Panel, risk management and public safety focus",
      frequency: "monthly",
    },
    {
      url: "https://www.ice.org.uk/download-centre/continuing-professional-development-cpd-guidance",
      label: "CPD guidance (downloadable)",
      extractionNotes:
        "Detailed CPD guidance document for ICE members",
      frequency: "monthly",
    },
    {
      url: "https://www.ice.org.uk/attributes",
      label: "ICE Attributes",
      extractionNotes:
        "Competence attributes for CEng, IEng, EngTech that underpin CPD requirements",
      frequency: "monthly",
    },
    {
      url: "https://www.ice.org.uk/learning-hub",
      label: "ICE Knowledge Hub",
      extractionNotes:
        "Learning resources for CPD, educational materials catalogue",
      frequency: "weekly",
    },
  ],
};

// ---------------------------------------------------------------------------
// Legal
// ---------------------------------------------------------------------------

const sra: CrawlSource = {
  id: "sra",
  organization: "Solicitors Regulation Authority",
  region: "GB",
  vertical: "legal",
  credentials: ["Solicitor (England & Wales)"],
  baseDomain: "sra.org.uk",
  targets: [
    {
      url: "https://www.sra.org.uk/solicitors/resources/continuing-competence/understanding-continuing-competence/",
      label: "Understanding continuing competence",
      extractionNotes:
        "No minimum hours since Nov 2016, reflection-based approach, annual declaration, learning from any source",
      frequency: "weekly",
    },
    {
      url: "https://www.sra.org.uk/solicitors/resources/continuing-competence/competence-statement/",
      label: "Statement of solicitor competence",
      extractionNotes:
        "Three-part competence framework: Statement of Solicitor Competence, Threshold Standard, Statement of Legal Knowledge",
      frequency: "monthly",
    },
    {
      url: "https://www.sra.org.uk/solicitors/resources/continuing-competence/continuing-competence-faqs/",
      label: "Continuing competence FAQs",
      extractionNotes:
        "Q&A on what counts, evidence requirements, annual declaration process, practising year (Nov 1 to Oct 31)",
      frequency: "monthly",
    },
    {
      url: "https://www.sra.org.uk/solicitors/resources/continuing-competence/templates/",
      label: "Learning and development template",
      extractionNotes:
        "SRA-provided template for recording CPD/competence activities",
      frequency: "monthly",
    },
    {
      url: "https://www.sra.org.uk/sra/research-publications/annual-assessment-continuing-competence-2024/",
      label: "Annual assessment of continuing competence",
      extractionNotes:
        "SRA monitoring data: compliance rates, enforcement actions, identified concerns",
      frequency: "monthly",
    },
    {
      url: "https://www.sra.org.uk/solicitors/resources/continuing-competence/cpd/continuing-competence/role-law-firms/",
      label: "Law firm role in continuing competence",
      extractionNotes:
        "Firm obligations, systems and processes for ensuring solicitor compliance",
      frequency: "monthly",
    },
    {
      url: "https://www.sra.org.uk/solicitors/resources/topic/continuing-competence/",
      label: "Continuing competence topic hub",
      extractionNotes:
        "Index of all SRA resources related to continuing competence",
      frequency: "weekly",
    },
  ],
};

const cilex: CrawlSource = {
  id: "cilex",
  organization: "Chartered Institute of Legal Executives",
  region: "GB",
  vertical: "legal",
  credentials: [
    "Chartered Legal Executive",
    "CILEX Practitioner",
    "CILEX Member",
  ],
  baseDomain: "cilex.org.uk",
  targets: [
    {
      url: "https://www.cilex.org.uk/membership/cpd/",
      label: "CPD main page",
      extractionNotes:
        "Practitioners: 9 CPD outcomes (5 planned, 1 professionalism). Members: 8h CPD + 1 professionalism outcome. CPD year ends 30 Sept.",
      frequency: "weekly",
    },
    {
      url: "https://www.cilex.org.uk/wp-content/uploads/cilex_cpd_guide_0522_v3.pdf",
      label: "CPD guidance document (PDF)",
      extractionNotes:
        "Detailed CPD guide: requirements by grade, what counts, recording guidance, non-compliance consequences",
      frequency: "monthly",
    },
    {
      url: "https://www.cilex.org.uk/membership/cpd/recording_your_cpd/",
      label: "Recording your CPD",
      extractionNotes:
        "myCILEX portal recording process, automatic submission on year end, log guidance",
      frequency: "monthly",
    },
    {
      url: "https://www.cilex.org.uk/membership/cpd/professionalism-package/",
      label: "CPD Professionalism Package",
      extractionNotes:
        "Professionalism-focused CPD modules available to members",
      frequency: "monthly",
    },
    {
      url: "https://www.cilex.org.uk/membership/cpd/development-package/",
      label: "CPD Development Package",
      extractionNotes:
        "31 SYTYKA CPD modules across practice areas, 22+ hours of content",
      frequency: "monthly",
    },
  ],
};

// ---------------------------------------------------------------------------
// Chartered / Accounting
// ---------------------------------------------------------------------------

const icaew: CrawlSource = {
  id: "icaew",
  organization:
    "Institute of Chartered Accountants in England and Wales",
  region: "GB",
  vertical: "chartered_accounting",
  credentials: ["ACA", "FCA (ICAEW)"],
  baseDomain: "icaew.com",
  targets: [
    {
      url: "https://www.icaew.com/membership/cpd",
      label: "CPD landing page",
      extractionNotes:
        "Overview of ICAEW CPD obligations, links to guide, regulations, and self-assessment tool",
      frequency: "weekly",
    },
    {
      url: "https://www.icaew.com/membership/cpd/your-guide-to-cpd",
      label: "Your guide to CPD",
      extractionNotes:
        "CPD year (Nov 1 to Oct 31), category-based hours, verifiable requirements, ethics component, annual declaration",
      frequency: "weekly",
    },
    {
      url: "https://www.icaew.com/regulation/training-and-education/cpd-regulations-2023",
      label: "CPD Regulations 2023",
      extractionNotes:
        "Full 2023 regulations: mandatory minimum hours, ethics requirement, introduced Nov 2023",
      frequency: "monthly",
    },
    {
      url: "https://www.icaew.com/regulation/training-and-education/cpd-regulations-2023/cpd-categories",
      label: "CPD categories",
      extractionNotes:
        "Three practice categories and three non-practice categories with specific hour and verifiable requirements per category",
      frequency: "monthly",
    },
    {
      url: "https://www.icaew.com/membership/cpd/your-guide-to-cpd/cpd-are-you-in-scope",
      label: "CPD self-assessment (are you in scope)",
      extractionNotes:
        "Decision tool for determining which CPD category applies based on role and seniority",
      frequency: "monthly",
    },
    {
      url: "https://www.icaew.com/membership/cpd/firm-responsibilities-for-revised-cpd-regulations",
      label: "Firm responsibilities for CPD",
      extractionNotes:
        "Firm obligations under CPD regulations: ensuring compliance, record keeping, QAD inspection",
      frequency: "monthly",
    },
  ],
};

const acca: CrawlSource = {
  id: "acca",
  organization:
    "Association of Chartered Certified Accountants",
  region: "INTL",
  vertical: "chartered_accounting",
  credentials: ["ACCA"],
  baseDomain: "accaglobal.com",
  targets: [
    {
      url: "https://www.accaglobal.com/gb/en/member/cpd/your-guide-to-cpd.html",
      label: "Your guide to CPD",
      extractionNotes:
        "Overview of CPD programme, four routes (Unit, Unit part-time, Approved Employer, additional)",
      frequency: "weekly",
    },
    {
      url: "https://www.accaglobal.com/us/en/member/cpd/your-guide-to-cpd/cpd-what-you-need-to-do.html",
      label: "CPD what you need to do",
      extractionNotes:
        "Unit route: 40 units/year (21 verifiable, 19 non-verifiable), carryover rules (up to 21 verifiable), annual declaration by Jan 1",
      frequency: "weekly",
    },
    {
      url: "https://www.accaglobal.com/us/en/member/cpd/your-guide-to-cpd/routes.html",
      label: "CPD routes",
      extractionNotes:
        "Details on each CPD route: unit (full-time), unit (part-time/semi-retired), Approved Employer, waivers",
      frequency: "monthly",
    },
    {
      url: "https://www.accaglobal.com/uk/en/help/member-cpd-faqs.html",
      label: "CPD FAQs",
      extractionNotes:
        "Frequently asked questions about CPD compliance, exemptions, edge cases",
      frequency: "monthly",
    },
    {
      url: "https://www.accaglobal.com/uk/en/employer/train-and-develop-finance-talent/supporting-your-acca-members/cpd-explained.html",
      label: "CPD explained (for employers)",
      extractionNotes:
        "Employer perspective on ACCA CPD requirements, Approved Employer route details",
      frequency: "monthly",
    },
  ],
};

const cipd: CrawlSource = {
  id: "cipd",
  organization:
    "Chartered Institute of Personnel and Development",
  region: "GB",
  vertical: "chartered_accounting",
  credentials: [
    "CIPD Associate",
    "CIPD Chartered Member",
    "CIPD Chartered Fellow",
  ],
  baseDomain: "cipd.org",
  targets: [
    {
      url: "https://www.cipd.org/en/learning/cpd/",
      label: "CPD landing page",
      extractionNotes:
        "Overview of CIPD CPD programme, links to policy, recording, and resources",
      frequency: "weekly",
    },
    {
      url: "https://www.cipd.org/en/learning/cpd/policy/",
      label: "CPD policy and requirements",
      extractionNotes:
        "~30h/year recommended planned learning, focus on impact, annual audit of randomly selected members, Code of Conduct linkage",
      frequency: "weekly",
    },
    {
      url: "https://www.cipd.org/en/learning/cpd/about/",
      label: "What is CPD",
      extractionNotes:
        "Definition, planned vs unplanned learning, focus on professional practice improvement",
      frequency: "monthly",
    },
    {
      url: "https://www.cipd.org/en/learning/cpd/cycle/",
      label: "Getting started with CPD",
      extractionNotes:
        "CPD cycle, recording process, My CPD Records tool, self-assessment tool alignment",
      frequency: "monthly",
    },
    {
      url: "https://www.cipd.org/en/learning/cpd/profession-map/",
      label: "Profession Map self-assessment tool",
      extractionNotes:
        "Self-assessment against Profession Map capabilities, gap identification, learning plan creation",
      frequency: "monthly",
    },
  ],
};

const cmi: CrawlSource = {
  id: "cmi",
  organization: "Chartered Management Institute",
  region: "GB",
  vertical: "chartered_accounting",
  credentials: ["CMgr", "ChMC", "CMI Member"],
  baseDomain: "managers.org.uk",
  targets: [
    {
      url: "https://www.managers.org.uk/education-and-learning/continuing-professional-development/",
      label: "CPD main page",
      extractionNotes:
        "CPD as fundamental membership requirement, 4-stage cycle (Reflection, Planning, Action, Evaluation), Code of Practice linkage",
      frequency: "weekly",
    },
    {
      url: "https://www.managers.org.uk/membership/chartered-manager/",
      label: "Chartered Manager",
      extractionNotes:
        "CPD evidence required for Chartered Manager status, annual sampling, 30-day submission window, removal process for non-compliance",
      frequency: "monthly",
    },
    {
      url: "https://www.managers.org.uk/membership/chartered-management-consultant/cpd-sampling/",
      label: "ChMC CPD sampling",
      extractionNotes:
        "Annual CPD record requirement for ChMC, 3-5 meaningful activities per 12 months, sampling process",
      frequency: "monthly",
    },
    {
      url: "https://www.managers.org.uk/membership/chartered-management-consultant/become-a-chartered-consultant/",
      label: "Become a Chartered Management Consultant",
      extractionNotes:
        "CPD requirements as part of ChMC eligibility and maintenance",
      frequency: "monthly",
    },
  ],
};

const cima: CrawlSource = {
  id: "cima",
  organization: "CIMA (AICPA & CIMA)",
  region: "INTL",
  vertical: "chartered_accounting",
  credentials: ["ACMA", "FCMA", "CGMA"],
  baseDomain: "cimaglobal.com",
  targets: [
    {
      url: "https://www.cimaglobal.com/Members/CPD/",
      label: "CPD main page",
      extractionNotes:
        "CPD as compulsory membership requirement, regulation 15 of royal charter",
      frequency: "weekly",
    },
    {
      url: "https://www.cimaglobal.com/Members/CPD/requirements/",
      label: "CPD requirements",
      extractionNotes:
        "Specific CPD hour/activity requirements per membership grade (may require auth to access full content)",
      frequency: "weekly",
    },
    {
      url: "https://www.cimaglobal.com/Members/CPD/CPD-Monitoring/",
      label: "CPD monitoring",
      extractionNotes:
        "CPD monitoring process, compliance checks, consequences of non-compliance",
      frequency: "monthly",
    },
    {
      url: "https://www.cimaglobal.com/Members/CPD/FAQs/",
      label: "CPD FAQs",
      extractionNotes:
        "Frequently asked questions about CIMA CPD requirements and compliance",
      frequency: "monthly",
    },
    {
      url: "https://www.cimaglobal.com/Members/Your-Membership-Information/Members-handbook/Licensing-and-monitoring/CIMA-professional-development-/CPD-regulations/",
      label: "CPD regulations",
      extractionNotes:
        "Full CPD regulation text from the members handbook",
      frequency: "monthly",
    },
  ],
};

// ---------------------------------------------------------------------------
// UK Market Participant CPD Hubs
// ---------------------------------------------------------------------------

const avivaHub: CrawlSource = {
  id: "aviva-cpd",
  organization: "Aviva",
  region: "GB",
  vertical: "market_participant_cpd_hub",
  credentials: [],
  baseDomain: "aviva.co.uk",
  targets: [
    {
      url: "https://www.aviva.co.uk/adviser/faa",
      label: "Aviva adviser homepage",
      extractionNotes:
        "Landing page for adviser resources, technical articles, business development support, CPD links",
      frequency: "weekly",
    },
    {
      url: "https://www.aviva.co.uk/business/workplace-wellbeing/webinar-hub/",
      label: "Workplace wellbeing webinar hub (CPD)",
      extractionNotes:
        "Live and on-demand webinars with CPD points, topics include mental health, women's health, neurodiversity",
      frequency: "weekly",
    },
    {
      url: "https://www.aviva.co.uk/business/business-perspectives/webinar-hub/",
      label: "Business perspectives webinar hub",
      extractionNotes:
        "Business-focused webinars contributing to CPD hours",
      frequency: "weekly",
    },
  ],
};

const lgHub: CrawlSource = {
  id: "lg-cpd",
  organization: "Legal & General",
  region: "GB",
  vertical: "market_participant_cpd_hub",
  credentials: [],
  baseDomain: "legalandgeneral.com",
  targets: [
    {
      url: "https://www.legalandgeneral.com/adviser/protection/knowledge-hub/cpd-academy/",
      label: "Protection CPD Academy",
      extractionNotes:
        "CII-accredited webinars and workshops, hundreds per year, advice process improvement topics, CPD certificates",
      frequency: "weekly",
    },
    {
      url: "https://www.legalandgeneral.com/adviser/annuities/adviser-academy/",
      label: "Annuities Adviser Academy",
      extractionNotes:
        "On-demand videos, articles, CPD materials for later-life planning advisers",
      frequency: "weekly",
    },
    {
      url: "https://www.legalandgeneral.com/adviser/mortgage-club/Adviser-Academy/",
      label: "Mortgage Club Adviser Academy",
      extractionNotes:
        "Recorded and live webinars, marketing toolkits for mortgage advisers",
      frequency: "weekly",
    },
    {
      url: "https://www.legalandgeneral.com/adviser/protection/knowledge-hub/cpd-academy/podcasts/",
      label: "CPD podcasts",
      extractionNotes:
        "Adviser-focused podcast episodes contributing to CPD",
      frequency: "weekly",
    },
    {
      url: "https://www.legalandgeneral.com/adviser/protection/professional-development/",
      label: "Professional development - protection",
      extractionNotes:
        "Webinar signup, product training, ongoing professional development resources",
      frequency: "weekly",
    },
    {
      url: "https://www.legalandgeneral.com/adviser/retirement/adviser-academy/on-demand-and-cpd/",
      label: "Retirement on-demand CPD",
      extractionNotes:
        "On-demand CPD content for retirement-focused advisers",
      frequency: "weekly",
    },
  ],
};

const zurichHub: CrawlSource = {
  id: "zurich-cpd",
  organization: "Zurich",
  region: "GB",
  vertical: "market_participant_cpd_hub",
  credentials: [],
  baseDomain: "zurich.co.uk",
  targets: [
    {
      url: "https://www.zurich.co.uk/news-and-insight/cpd-hub",
      label: "CPD Hub landing page",
      extractionNotes:
        "CII-accredited CPD content hub, structured learning hours tracking, article-based learning outcomes",
      frequency: "weekly",
    },
    {
      url: "https://insider.zurich.co.uk/cpd-hub/",
      label: "Insider CPD Hub",
      extractionNotes:
        "Full CPD content library with learning outcomes, time-tracked reading, quiz questions. Requires 10 articles over 30 min per learning outcome.",
      frequency: "weekly",
    },
  ],
};

const royalLondonHub: CrawlSource = {
  id: "royal-london-cpd",
  organization: "Royal London",
  region: "GB",
  vertical: "market_participant_cpd_hub",
  credentials: [],
  baseDomain: "adviser.royallondon.com",
  targets: [
    {
      url: "https://adviser.royallondon.com/technical-central/cpd/",
      label: "CPD and webinars main page",
      extractionNotes:
        "CPD webinars and articles index, certificates via quiz completion, pension and protection coverage",
      frequency: "weekly",
    },
    {
      url: "https://adviser.royallondon.com/technical-central/cpd/pensions-cpd-hub/",
      label: "Pensions and Investment CPD Hub",
      extractionNotes:
        "Accredited CPD webinars on pensions, investment, Consumer Duty, IHT, Budget changes",
      frequency: "weekly",
    },
    {
      url: "https://adviser.royallondon.com/technical-central/cpd/protection-cpd-hub/",
      label: "Protection CPD Hub",
      extractionNotes:
        "CPD for IDD compliance (15h insurance distribution), protection-focused modules",
      frequency: "weekly",
    },
    {
      url: "https://adviser.royallondon.com/technical-central/",
      label: "Technical Central",
      extractionNotes:
        "Technical articles, guidance, case studies that may offer CPD opportunities",
      frequency: "weekly",
    },
  ],
};

const standardLifeHub: CrawlSource = {
  id: "standard-life-cpd",
  organization: "Standard Life (abrdn)",
  region: "GB",
  vertical: "market_participant_cpd_hub",
  credentials: [],
  baseDomain: "standardlife.co.uk",
  targets: [
    {
      url: "https://www.standardlife.co.uk/adviser",
      label: "Adviser homepage",
      extractionNotes:
        "Adviser tools, platform features, links to professional development content",
      frequency: "weekly",
    },
    {
      url: "https://www.standardlife.co.uk/adviser/paraplanner-cpd",
      label: "Paraplanner CPD",
      extractionNotes:
        "Dedicated CPD content for paraplanners, Paraplanner Assembly",
      frequency: "weekly",
    },
    {
      url: "https://www.standardlife.co.uk/adviser/business-support/insight-opinion/article-page/retirement-voice-adviser-edition",
      label: "Retirement Voice CPD report",
      extractionNotes:
        "CPD-accredited research report, 60 minutes CPD available from reading",
      frequency: "monthly",
    },
  ],
};

const aegonHub: CrawlSource = {
  id: "aegon-cpd",
  organization: "Aegon",
  region: "GB",
  vertical: "market_participant_cpd_hub",
  credentials: [],
  baseDomain: "aegon.co.uk",
  targets: [
    {
      url: "https://www.aegon.co.uk/adviser/knowledge-centre/continuous-professional-development",
      label: "CPD Hub",
      extractionNotes:
        "Webinar library with CPD certificates, topics include Consumer Duty, pension contributions, taking benefits, human-centric planning. 30 min modules.",
      frequency: "weekly",
    },
    {
      url: "https://www.aegon.co.uk/adviser/knowledge-centre",
      label: "Knowledge Centre",
      extractionNotes:
        "Broader knowledge resources that may include CPD-eligible content, research, guides",
      frequency: "weekly",
    },
  ],
};

const scottishWidowsHub: CrawlSource = {
  id: "scottish-widows-cpd",
  organization: "Scottish Widows",
  region: "GB",
  vertical: "market_participant_cpd_hub",
  credentials: [],
  baseDomain: "adviser.scottishwidows.co.uk",
  targets: [
    {
      url: "https://adviser.scottishwidows.co.uk/expertise/professional-development.html",
      label: "Professional development / CPD",
      extractionNotes:
        "CII-accredited courses on IHT, pension taxation, emergency tax. Structured CPD learning.",
      frequency: "weekly",
    },
    {
      url: "https://adviser.scottishwidows.co.uk/expertise.html",
      label: "Expertise hub",
      extractionNotes:
        "Technical insight, expert opinion, analysis, and CPD opportunity listings",
      frequency: "weekly",
    },
    {
      url: "https://adviser.scottishwidows.co.uk/expertise/knowledge-centre.html",
      label: "Knowledge Centre / Library",
      extractionNotes:
        "TechTalk commentary, expert series webinars, vodcasts, podcasts",
      frequency: "weekly",
    },
  ],
};

const canadaLifeHub: CrawlSource = {
  id: "canada-life-cpd",
  organization: "Canada Life",
  region: "GB",
  vertical: "market_participant_cpd_hub",
  credentials: [],
  baseDomain: "canadalife.co.uk",
  targets: [
    {
      url: "https://www.canadalife.co.uk/ican-academy/cpd/",
      label: "ican Academy CPD page",
      extractionNotes:
        "CPD certificates for structured training, unstructured CPD logging, FCA 35h/21h requirement context",
      frequency: "weekly",
    },
    {
      url: "https://www.canadalife.co.uk/ican-academy/",
      label: "ican Academy landing page",
      extractionNotes:
        "Award-winning technical support and CPD training hub, multi-media content, live and on-demand",
      frequency: "weekly",
    },
    {
      url: "https://www.canadalife.co.uk/ican-academy/find-learning/",
      label: "ican Academy search/catalogue",
      extractionNotes:
        "Searchable CPD resource catalogue covering retirement, home finance, tax, estate planning, investments",
      frequency: "weekly",
    },
    {
      url: "https://www.canadalife.co.uk/ican-academy/retirement/",
      label: "Retirement CPD",
      extractionNotes:
        "Retirement-focused technical support and CPD content",
      frequency: "weekly",
    },
    {
      url: "https://www.canadalife.co.uk/ican-academy/estate-planning/",
      label: "Estate planning CPD",
      extractionNotes:
        "Trust planning, IHT, gifting, death estate, Will/intestacy CPD content",
      frequency: "weekly",
    },
    {
      url: "https://www.canadalife.co.uk/unretire/retirement-journeys-cpd-hub/",
      label: "Retirement Journeys CPD hub",
      extractionNotes:
        "Specialised retirement journeys CPD programme",
      frequency: "weekly",
    },
  ],
};

const quilterHub: CrawlSource = {
  id: "quilter-cpd",
  organization: "Quilter",
  region: "GB",
  vertical: "market_participant_cpd_hub",
  credentials: [],
  baseDomain: "quilter.com",
  targets: [
    {
      url: "https://www.quilter.com/our-partnership-options/quilter-academy/",
      label: "Quilter Academy",
      extractionNotes:
        "Training programmes, Level 4 Diploma pathway, CPD support for qualified advisers",
      frequency: "weekly",
    },
    {
      url: "https://www.quilter.com/partner-with-us/join-us/developing-you-and-your-business/",
      label: "Developing you and your business",
      extractionNotes:
        "Ongoing CPD support, development pathways, mentoring, training resources for partner advisers",
      frequency: "weekly",
    },
    {
      url: "https://www.quilter.com/help-and-support/platform-support/tailored-training-plans/financial-adviser-training-plan/",
      label: "Financial adviser training plan",
      extractionNotes:
        "Tailored CPD training plans for financial advisers using the Quilter platform",
      frequency: "monthly",
    },
  ],
};

const nucleusHub: CrawlSource = {
  id: "nucleus-cpd",
  organization: "Nucleus Financial",
  region: "GB",
  vertical: "market_participant_cpd_hub",
  credentials: [],
  baseDomain: "nucleusfinancial.com",
  targets: [
    {
      url: "https://nucleusfinancial.com/advisers",
      label: "Adviser homepage",
      extractionNotes:
        "On-demand technical content with CPD points, event listings, community resources",
      frequency: "weekly",
    },
    {
      url: "https://www.nucleusfinancial.com/advisers/events",
      label: "Events page",
      extractionNotes:
        "CII-accredited events, Illuminate Live, annual conference, user sessions, practice development forums - all with CPD certificates",
      frequency: "weekly",
    },
    {
      url: "https://nucleusfinancial.com/community/practice-development-group",
      label: "Practice Development Group events",
      extractionNotes:
        "Business development and practice management events with CPD accreditation",
      frequency: "weekly",
    },
  ],
};

// ---------------------------------------------------------------------------
// Export: all sources
// ---------------------------------------------------------------------------

export const crawlSources: CrawlSource[] = [
  // Financial Services - US
  cfpBoard,
  finra,
  nasaa,
  // Financial Services - UK
  fca,
  cii,
  cisi,
  // Financial Services - International
  asic,
  fpCanada,
  mas,
  sfc,
  // Health Professions
  nmc,
  gmc,
  gphc,
  hcpc,
  // Engineering
  engCouncil,
  iet,
  ice,
  // Legal
  sra,
  cilex,
  // Chartered / Accounting
  icaew,
  acca,
  cipd,
  cmi,
  cima,
  // UK Market Participant CPD Hubs
  avivaHub,
  lgHub,
  zurichHub,
  royalLondonHub,
  standardLifeHub,
  aegonHub,
  scottishWidowsHub,
  canadaLifeHub,
  quilterHub,
  nucleusHub,
];

// ---------------------------------------------------------------------------
// Summary statistics (for logging / validation)
// ---------------------------------------------------------------------------

export function getCrawlStats() {
  const totalTargets = crawlSources.reduce(
    (sum, s) => sum + s.targets.length,
    0
  );
  const byFrequency = crawlSources.reduce(
    (acc, s) => {
      for (const t of s.targets) {
        acc[t.frequency] = (acc[t.frequency] || 0) + 1;
      }
      return acc;
    },
    {} as Record<CrawlFrequency, number>
  );
  const byVertical = crawlSources.reduce(
    (acc, s) => {
      acc[s.vertical] = (acc[s.vertical] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const byRegion = crawlSources.reduce(
    (acc, s) => {
      acc[s.region] = (acc[s.region] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalSources: crawlSources.length,
    totalTargets,
    byFrequency,
    byVertical,
    byRegion,
  };
}
