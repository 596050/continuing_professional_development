export function Footer() {
  return (
    <footer className="border-t border-border-light bg-white px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="text-lg font-bold tracking-tight text-text">
              Audit<span className="text-accent">Ready</span>CPD
            </div>
            <p className="mt-3 text-sm text-text-light">
              CPD/CE compliance, planned and audit-ready. For financial advisers worldwide.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text">Product</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#how-it-works" className="text-sm text-text-light hover:text-text-muted">
                  How it works
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-sm text-text-light hover:text-text-muted">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="text-sm text-text-light hover:text-text-muted">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text">Credentials</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#" className="text-sm text-text-light hover:text-text-muted">
                  CFP CE Requirements
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-text-light hover:text-text-muted">
                  IAR CE Requirements
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-text-light hover:text-text-muted">
                  UK Adviser CPD
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-text-light hover:text-text-muted">
                  Australia FASEA CPD
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text">Resources</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#" className="text-sm text-text-light hover:text-text-muted">
                  CPD Audit Checklist
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-text-light hover:text-text-muted">
                  CPD Policy Template
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-text-light hover:text-text-muted">
                  Deadline Calendar
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-border-light pt-8 text-center text-xs text-text-light">
          <p>
            AuditReadyCPD provides CPD/CE planning, tracking, evidence management, and audit
            packaging. We do not complete coursework or assessments on behalf of users, and we do not
            falsify any records.
          </p>
          <p className="mt-4">&copy; {new Date().getFullYear()} AuditReadyCPD. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
