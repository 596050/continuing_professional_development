"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spinner, TopBar, DataList, DataRow } from "@/components/ui";

interface VerificationResult {
  valid: boolean;
  certificateCode?: string;
  status?: string;
  title?: string;
  recipientName?: string;
  hours?: number;
  category?: string;
  credentialName?: string;
  provider?: string;
  completedDate?: string;
  issuedDate?: string;
  message?: string;
  error?: string;
}

export default function CertificateVerifyPage() {
  const { code } = useParams<{ code: string }>();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/certificates/verify/${code}`)
      .then((res) => res.json())
      .then(setResult)
      .catch(() => setResult({ valid: false, error: "Verification service unavailable" }))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return <Spinner text="Verifying certificate..." />;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopBar maxWidth="max-w-3xl">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Certificate Verification
        </span>
      </TopBar>

      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        {result?.valid ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Valid banner */}
            <div className="bg-emerald-600 px-8 py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h1 className="mt-3 text-xl font-bold text-white">Certificate Verified</h1>
              <p className="mt-1 text-sm text-emerald-100">This is a valid, active certificate issued by AuditReadyCPD.</p>
            </div>

            {/* Certificate details */}
            <div className="px-8 py-6">
              <h2 className="text-lg font-semibold text-gray-900">{result.title}</h2>
              <div className="mt-6">
                <DataList>
                  <DataRow label="Recipient" value={result.recipientName ?? "---"} />
                  <DataRow label="Certificate Code" value={result.certificateCode ?? "---"} mono />
                  <DataRow label="Hours" value={`${result.hours ?? 0} CPD hour${(result.hours ?? 0) !== 1 ? "s" : ""}`} />
                  <DataRow label="Category" value={result.category ?? "---"} capitalize />
                  {result.credentialName && <DataRow label="Credential" value={result.credentialName} />}
                  {result.provider && <DataRow label="Provider" value={result.provider} />}
                  <DataRow
                    label="Completed"
                    value={result.completedDate ? new Date(result.completedDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "---"}
                  />
                  <DataRow
                    label="Issued"
                    value={result.issuedDate ? new Date(result.issuedDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "---"}
                  />
                  <DataRow label="Status" value={result.status === "active" ? "Active" : result.status ?? "---"} badge={result.status === "active" ? "green" : "gray"} />
                </DataList>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-8 py-4">
              <p className="text-center text-xs text-gray-500">
                Verified on {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} via AuditReadyCPD certificate verification service.
              </p>
            </div>
          </div>
        ) : result?.status === "revoked" ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-red-600 px-8 py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h1 className="mt-3 text-xl font-bold text-white">Certificate Revoked</h1>
              <p className="mt-1 text-sm text-red-100">{result.message ?? "This certificate is no longer valid."}</p>
            </div>
            <div className="px-8 py-6">
              <DataList>
                <DataRow label="Certificate Code" value={result.certificateCode ?? code} mono />
                <DataRow label="Status" value="Revoked" badge="red" />
                {result.issuedDate && (
                  <DataRow
                    label="Originally Issued"
                    value={new Date(result.issuedDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  />
                )}
              </DataList>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-gray-700 px-8 py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="mt-3 text-xl font-bold text-white">Certificate Not Found</h1>
              <p className="mt-1 text-sm text-gray-300">{result?.error ?? "This code does not match any issued certificate."}</p>
            </div>
            <div className="px-8 py-6 text-center">
              <p className="text-sm text-gray-600">
                The code <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm">{code}</code> was not found in our records.
              </p>
              <p className="mt-3 text-sm text-gray-500">
                If you believe this is an error, please contact the certificate holder or <a href="/" className="font-medium text-blue-600 underline">AuditReadyCPD support</a>.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="/" className="text-sm font-medium text-blue-600 hover:underline">
            Back to AuditReadyCPD
          </a>
        </div>
      </div>
    </div>
  );
}
