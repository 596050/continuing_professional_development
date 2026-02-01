"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Button, Card, Input, Alert, Spinner,
  AppNav, TabNav, DataList, DataRow,
  Badge, ProgressBar, EmptyState,
} from "@/components/ui";

interface CredentialInfo {
  id: string;
  credentialId: string;
  name: string;
  body: string;
  region: string;
  jurisdiction: string;
  renewalDeadline: string | null;
  hoursCompleted: number;
  hoursRequired: number | null;
  isPrimary: boolean;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
  planActivatedAt: string | null;
  createdAt: string;
}

type Tab = "profile" | "credentials" | "security";

const tabs: { key: Tab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "credentials", label: "Credentials" },
  { key: "security", label: "Security" },
];

export default function SettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [credentials, setCredentials] = useState<CredentialInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("profile");

  // Profile form
  const [name, setName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setCredentials(data.credentials ?? []);
        setName(data.user?.name ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authStatus]);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      setProfileMsg({ type: "success", text: "Profile updated." });
    } catch (err) {
      setProfileMsg({ type: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to change password");
      }
      setPwMsg({ type: "success", text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwMsg({ type: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setPwSaving(false);
    }
  };

  if (authStatus === "loading" || loading) return <Spinner text="Loading settings..." />;

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Please sign in to access settings.</p>
          <a href="/auth/signin" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        <div className="mt-6">
          <TabNav tabs={tabs} active={tab} onChange={setTab} />
        </div>

        {/* Profile tab */}
        {tab === "profile" && user && (
          <div className="mt-8 space-y-6">
            <Card>
              <h2 className="text-base font-semibold text-gray-900">Your details</h2>
              <div className="mt-4 space-y-4">
                <Input label="Full name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="Email" type="email" value={user.email} disabled hint="Email cannot be changed." />
              </div>

              {profileMsg && (
                <Alert variant={profileMsg.type} className="mt-4">{profileMsg.text}</Alert>
              )}

              <div className="mt-6 flex justify-end">
                <Button onClick={handleProfileSave} disabled={profileSaving}>
                  {profileSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-gray-900">Account</h2>
              <div className="mt-4 text-sm">
                <DataList>
                  <DataRow label="Plan" value={<span className="capitalize text-blue-600">{user.plan}</span>} />
                  <DataRow label="Role" value={user.role.replace("_", " ")} capitalize />
                  <DataRow
                    label="Member since"
                    value={new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  />
                </DataList>
              </div>
            </Card>
          </div>
        )}

        {/* Credentials tab */}
        {tab === "credentials" && (
          <div className="mt-8 space-y-4">
            {credentials.length === 0 ? (
              <EmptyState
                message="No credentials configured."
                action={<a href="/onboarding" className="text-sm font-medium text-blue-600 underline">Complete onboarding to add a credential</a>}
              />
            ) : (
              credentials.map((cred) => (
                <Card key={cred.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900">{cred.name}</h3>
                        {cred.isPrimary && <Badge variant="blue" shape="rounded">Primary</Badge>}
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">{cred.body} ({cred.region})</p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-gray-500">Jurisdiction</dt>
                      <dd className="mt-0.5 font-medium text-gray-900">{cred.jurisdiction}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Hours completed</dt>
                      <dd className="mt-0.5 font-medium text-gray-900">
                        {cred.hoursCompleted}{cred.hoursRequired ? ` / ${cred.hoursRequired}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Renewal deadline</dt>
                      <dd className="mt-0.5 font-medium text-gray-900">
                        {cred.renewalDeadline
                          ? new Date(cred.renewalDeadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                          : "Not set"}
                      </dd>
                    </div>
                  </dl>

                  {cred.hoursRequired && cred.hoursRequired > 0 && (
                    <div className="mt-4">
                      <ProgressBar completed={cred.hoursCompleted} required={cred.hoursRequired} />
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Security tab */}
        {tab === "security" && (
          <div className="mt-8">
            <Card>
              <h2 className="text-base font-semibold text-gray-900">Change password</h2>
              <div className="mt-4 space-y-4">
                <Input label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                <Input label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
                <Input label="Confirm new password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>

              {pwMsg && (
                <Alert variant={pwMsg.type} className="mt-4">{pwMsg.text}</Alert>
              )}

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handlePasswordChange}
                  disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
                >
                  {pwSaving ? "Changing..." : "Change password"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
