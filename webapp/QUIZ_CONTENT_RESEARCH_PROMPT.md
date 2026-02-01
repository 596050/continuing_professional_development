# Quiz Content Research Prompt

Use this prompt with an AI research assistant or web search to generate quiz content for each credential, jurisdiction, and profession in the AuditReadyCPD platform.

---

## The Prompt

```
I am building a CPD (Continuing Professional Development) compliance platform called AuditReadyCPD. I need quiz content for professionals who hold specific credentials. Each quiz should test knowledge that is directly relevant to their credential's CPD requirements.

For each credential below, I need you to research and create:

1. **3-5 quiz modules** per credential, each with 10-15 multiple-choice questions
2. Each question should have 4 answer options with exactly one correct answer
3. Include an explanation for each correct answer (1-2 sentences)
4. Tag each quiz with: credential, category (ethics/technical/general/practice_mgmt/professionalism), hours awarded, and pass mark

The quizzes should cover topics that the credential's governing body would accept as valid CPD. Do NOT invent rules - research the actual requirements from the official body's website.

### FORMAT

For each quiz, output JSON in this exact structure:

{
  "title": "Quiz title here",
  "description": "Brief description of what this quiz covers",
  "credentialId": "credential identifier",
  "category": "ethics | technical | general | practice_mgmt | professionalism",
  "activityType": "structured",
  "passMark": 70,
  "maxAttempts": 3,
  "hours": 1,
  "questions": [
    {
      "question": "The question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 1,
      "explanation": "Why option B is correct."
    }
  ]
}

---

### CREDENTIALS TO COVER

#### 1. CFP (Certified Financial Planner) - US
- Body: CFP Board
- Requirements: 30 hours per 2-year cycle (increasing to 40 from 2027), 2 hours ethics mandatory
- Categories accepted: general financial planning, ethics, estate planning, tax planning, retirement planning, insurance planning, investment planning
- Research: cfp.net CE requirements
- Quizzes needed:
  a) Ethics and Professional Responsibility (2h, ethics category)
  b) Retirement and Income Planning (2h, technical)
  c) Tax Planning Fundamentals (2h, technical)
  d) Investment Management and Fiduciary Duty (2h, technical)
  e) Estate Planning and Wealth Transfer (2h, technical)

#### 2. FINRA Series (Financial Industry Regulatory Authority) - US
- Body: FINRA
- Requirements: Content-based (regulatory element + firm element), annual
- Categories: regulatory_element, firm_element
- Research: finra.org continuing education requirements
- Quizzes needed:
  a) Regulatory Element: Suitability and Know Your Customer (1h, regulatory)
  b) Regulatory Element: Anti-Money Laundering (1h, regulatory)
  c) Firm Element: Product Knowledge Update (1h, firm_element)

#### 3. IAR (Investment Adviser Representative) - US
- Body: NASAA
- Requirements: 12 credits/year, 6 ethics + 6 products-and-practice
- Research: nasaa.org IAR CE requirements
- Quizzes needed:
  a) Ethics for Investment Advisers (2h, ethics)
  b) Fiduciary Duty and Conflicts of Interest (2h, ethics)
  c) Products and Practice: Alternative Investments (2h, technical)
  d) Products and Practice: Risk Assessment (2h, technical)

#### 4. FCA Adviser (Retail Investment Adviser) - UK
- Body: FCA (Financial Conduct Authority)
- Requirements: 35 hours/year, minimum 21 structured
- Categories: structured, unstructured
- Research: fca.org.uk CPD requirements for retail investment advisers
- Quizzes needed:
  a) Consumer Duty and Treating Customers Fairly (2h, ethics)
  b) FCA Regulatory Framework Update (2h, technical)
  c) Pension Freedom and Retirement Advice (2h, technical)
  d) Vulnerable Customers and Accessibility (1h, professionalism)
  e) Investment Risk and Suitability Assessment (2h, technical)

#### 5. CII/PFS (Chartered Insurance Institute / Personal Finance Society) - UK
- Body: Chartered Insurance Institute
- Requirements: 35 hours/year, 21 structured, 10% random audit
- Member grades: Cert CII, Dip CII, APFS, Chartered
- Research: cii.co.uk CPD requirements
- Quizzes needed:
  a) Insurance Principles and Practice (2h, technical)
  b) Financial Protection and Life Insurance (2h, technical)
  c) Ethics and Professional Standards (CII Code) (2h, ethics)
  d) Mortgage Advice and Regulation (2h, technical)

#### 6. CISI (Chartered Institute for Securities and Investment) - UK
- Body: CISI
- Requirements: 35 hours (Chartered), 10 hours (Standard), 3.5 ethics mandatory
- Research: cisi.org CPD requirements
- Quizzes needed:
  a) Securities and Investment Regulations (2h, technical)
  b) Market Conduct and Integrity (1.5h, ethics)
  c) Wealth Management Best Practices (2h, technical)
  d) Anti-Financial Crime and Compliance (2h, ethics)

#### 7. FASEA/ASIC (Financial Advisers Standards and Ethics Authority) - Australia
- Body: ASIC
- Requirements: 40 hours/year across 4 knowledge areas
- Categories: technical_competence, client_care, regulatory_compliance, professionalism_ethics
- Research: asic.gov.au CPD requirements for financial advisers
- Quizzes needed:
  a) Australian Financial Services Regulatory Framework (2h, regulatory_compliance)
  b) Client Care and Best Interest Duty (2h, client_care)
  c) Technical Competence: Superannuation (2h, technical_competence)
  d) Professionalism and Ethics (FASEA Code) (2h, professionalism_ethics)
  e) Risk Management and Insurance Advice (2h, technical_competence)

#### 8. FP Canada CFP - Canada
- Body: FP Canada
- Requirements: 25 CE credits/year, minimum 1 professional responsibility
- Categories: financial_planning, professional_responsibility, practice_management
- Research: fpcanada.ca CE requirements
- Quizzes needed:
  a) Professional Responsibility and Standards of Conduct (2h, professional_responsibility)
  b) Canadian Tax Planning for Individuals (2h, financial_planning)
  c) Retirement and Estate Planning (Canadian context) (2h, financial_planning)
  d) Practice Management and Client Engagement (2h, practice_management)

#### 9. FP Canada QAFP - Canada
- Body: FP Canada
- Requirements: 12 CE credits/year, minimum 1 professional responsibility
- Research: fpcanada.ca QAFP CE requirements
- Quizzes needed:
  a) QAFP Professional Responsibility (1h, professional_responsibility)
  b) Financial Planning Fundamentals (2h, financial_planning)
  c) Debt and Cash Flow Management (2h, financial_planning)

#### 10. MAS Licensed Rep - Singapore
- Body: MAS (Monetary Authority of Singapore)
- Requirements: 30 hours/year, 6 ethics, 8 rules-and-regulations
- Research: mas.gov.sg CPD requirements for financial advisers
- Quizzes needed:
  a) MAS Rules and Regulations (2h, regulatory)
  b) Ethics in Financial Advisory (Singapore) (2h, ethics)
  c) Insurance and Investment Products (Singapore market) (2h, technical)
  d) Anti-Money Laundering (Singapore framework) (2h, regulatory)

#### 11. SFC Licensed Rep - Hong Kong
- Body: SFC (Securities and Futures Commission)
- Requirements: 10 CPT hours/year (12 for Responsible Officers), 2 ethics, 5 approved
- Research: sfc.hk CPT requirements
- Quizzes needed:
  a) SFC Code of Conduct and Ethics (2h, ethics)
  b) Securities and Futures Ordinance (2h, technical)
  c) Compliance and Risk Management (HK) (2h, technical)

#### 12. NMC Nurse/Midwife - UK (Health)
- Body: NMC (Nursing and Midwifery Council)
- Requirements: 35 hours over 3-year cycle, 20 participatory
- Additional: 5 feedback pieces, 5 reflective accounts, reflective discussion
- Research: nmc.org.uk revalidation requirements
- Quizzes needed:
  a) Patient Safety and Clinical Governance (2h, technical)
  b) NMC Code of Professional Conduct (2h, ethics)
  c) Safeguarding Vulnerable Adults and Children (2h, technical)
  d) Medicines Management and Administration (2h, technical)
  e) Infection Prevention and Control (1h, technical)

#### 13. ACCA (Association of Chartered Certified Accountants) - International
- Body: ACCA
- Requirements: 40 units/year, 21 verifiable + 19 non-verifiable
- Research: accaglobal.com CPD requirements
- Quizzes needed:
  a) International Financial Reporting Standards (IFRS) Update (2h, technical)
  b) Ethics and Professional Conduct (ACCA Code) (2h, ethics)
  c) Audit and Assurance Principles (2h, technical)
  d) Tax Compliance and Planning (International) (2h, technical)
  e) Corporate Governance and Risk Management (2h, technical)

#### 14. ICAEW (Institute of Chartered Accountants in England and Wales) - UK
- Body: ICAEW
- Requirements: Outcome-based (no fixed hours), must demonstrate competence
- Categories: ethics, technical, business_skills, personal_effectiveness, practice_management, industry_sector
- Research: icaew.com CPD requirements
- Quizzes needed:
  a) ICAEW Code of Ethics and Professional Judgment (2h, ethics)
  b) UK Audit Standards and Regulations (2h, technical)
  c) Business Advisory and Management Consulting Skills (2h, business_skills)
  d) Practice Management and Client Service (2h, practice_management)

---

### ADDITIONAL PROFESSIONS TO RESEARCH (expansion opportunities)

For each profession below, research the governing body, CPD requirements, and create 3-5 quiz modules:

#### Legal (CLE - Continuing Legal Education)
- **US Bar Associations** (state-specific): Most require 12-15 CLE hours/year, 2-4 ethics
  - Topics: ethics, legal technology, diversity/inclusion, substance abuse awareness
- **Solicitors Regulation Authority (SRA) - UK**: Competence-based, no fixed hours
  - Topics: SRA Code, client care, anti-money laundering, litigation skills
- **Law Society of Ontario - Canada**: 12 hours/year professionalism requirement
  - Topics: professional responsibility, practice management, Indigenous cultural competency

#### Engineering (PE/PDH - Professional Development Hours)
- **NCEES / State PE Boards - US**: Typically 15 PDH/year
  - Topics: engineering ethics, technical updates, safety, project management
- **Engineers Australia**: 150 hours over 3 years
  - Topics: risk management, sustainability, engineering management, technical competence
- **Engineering Council UK (CEng/IEng)**: 30 hours/year
  - Topics: professional ethics, technical innovation, safety engineering

#### Healthcare (beyond NMC)
- **GMC (General Medical Council) - UK Doctors**: 50 credits/year, annual appraisal
  - Topics: clinical governance, patient safety, medical ethics, communication skills
- **AHPRA (Australian Health Practitioner Regulation Agency)**: Varies by profession
  - Topics: cultural safety, infection control, evidence-based practice
- **AMA PRA (American Medical Association)**: CME Category 1 credits
  - Topics: patient safety, quality improvement, medical ethics, clinical updates

#### IT and Cybersecurity
- **CISSP (ISC2)**: 40 CPE credits/year
  - Topics: security architecture, risk management, software security, operations security
- **PMP (Project Management Institute)**: 60 PDU per 3-year cycle
  - Topics: agile methodologies, stakeholder management, risk management, strategic alignment
- **AWS/Azure/GCP Certifications**: Recertification every 2-3 years
  - Topics: cloud architecture, security best practices, cost optimization

#### Education
- **Teaching Regulation Agency (TRA) - UK**: Annual professional development
  - Topics: safeguarding, SEND (Special Educational Needs), assessment practices
- **State Education Departments - US**: 15-30 CEU hours/year (varies by state)
  - Topics: classroom management, educational technology, cultural responsiveness

### OUTPUT REQUIREMENTS

For each quiz module:
1. Ensure questions are factually accurate for the jurisdiction and year (2025-2026)
2. Reference actual regulations, codes, and standards by name
3. Include scenario-based questions (not just recall) - at least 30% of questions should be "In this situation, what should you do?"
4. Difficulty should match a practicing professional, not a student
5. Include questions about recent regulatory changes or updates where relevant
6. Avoid trivial or overly obvious questions
7. Each quiz should take 15-30 minutes to complete (10-15 questions)

### SOURCES TO RESEARCH

For each credential, check:
- The governing body's official website for current CPD/CE requirements
- Published sample exam questions or study guides
- Recent regulatory updates or consultations
- Industry publications and trade journals
- Professional standards documents and codes of conduct
```

---

## How to Use This Prompt

1. Copy the prompt above into Claude, ChatGPT, or another AI assistant
2. Ask it to generate quizzes one credential at a time (start with CFP, then FCA, etc.)
3. Review the output for accuracy against official sources
4. Import the JSON directly into the platform via `POST /api/quizzes` (admin auth required)

## Credential Coverage Matrix

| Credential | Country | Profession | Quizzes Needed | Priority |
|-----------|---------|------------|---------------|----------|
| CFP | US | Financial Planner | 5 | P0 |
| FINRA Series | US | Broker-Dealer Rep | 3 | P0 |
| IAR | US | Investment Adviser | 4 | P0 |
| FCA Adviser | UK | Financial Adviser | 5 | P0 |
| CII/PFS | UK | Insurance/Finance | 4 | P0 |
| CISI | UK | Securities/Investment | 4 | P1 |
| FASEA/ASIC | AU | Financial Adviser | 5 | P0 |
| FP Canada CFP | CA | Financial Planner | 4 | P1 |
| FP Canada QAFP | CA | Financial Planner | 3 | P1 |
| MAS Licensed | SG | Financial Adviser | 4 | P1 |
| SFC Licensed | HK | Securities Rep | 3 | P1 |
| NMC Nurse | UK | Nursing/Midwifery | 5 | P2 |
| ACCA | INTL | Accountant | 5 | P1 |
| ICAEW | UK | Chartered Accountant | 4 | P1 |
| US Bar (CLE) | US | Lawyer | 4 | P2 |
| SRA | UK | Solicitor | 3 | P2 |
| PE Boards | US | Engineer | 3 | P2 |
| GMC | UK | Doctor | 4 | P2 |
| CISSP | INTL | Cybersecurity | 4 | P3 |
| PMP | INTL | Project Manager | 3 | P3 |

**Total: ~80 quiz modules across 20 credentials and 7 professions**
