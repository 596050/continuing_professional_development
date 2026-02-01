/**
 * Email delivery utility.
 *
 * Uses nodemailer for SMTP delivery. Falls back to console logging in
 * development when SMTP_HOST is not configured.
 *
 * Environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */

import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

const defaultFrom = process.env.EMAIL_FROM ?? "noreply@auditreadycpd.com";

function createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Development: log to console
  return null;
}

const transport = createTransport();

export async function sendEmail(opts: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
  if (!transport) {
    // Development fallback: log to console
    console.log(`[EMAIL] To: ${opts.to} | Subject: ${opts.subject}`);
    if (opts.text) console.log(`[EMAIL] Body: ${opts.text.substring(0, 200)}`);
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  try {
    const result = await transport.sendMail({
      from: defaultFrom,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("[EMAIL] Send failed:", error);
    return { success: false };
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

export function deadlineReminderEmail(name: string, credential: string, daysLeft: number, deadline: string): EmailOptions {
  return {
    to: "", // caller fills in
    subject: `CPD Deadline Reminder: ${daysLeft} days remaining for ${credential}`,
    text: [
      `Hi ${name},`,
      "",
      `This is a reminder that your ${credential} CPD cycle ends on ${deadline}.`,
      `You have ${daysLeft} days remaining to complete your requirements.`,
      "",
      "Log in to your dashboard to check your progress:",
      `${process.env.BASE_URL ?? "http://localhost:3000"}/dashboard`,
      "",
      "— AuditReadyCPD",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1B2A4A;">CPD Deadline Reminder</h2>
        <p>Hi ${name},</p>
        <p>This is a reminder that your <strong>${credential}</strong> CPD cycle ends on <strong>${deadline}</strong>.</p>
        <p>You have <strong>${daysLeft} days</strong> remaining to complete your requirements.</p>
        <p><a href="${process.env.BASE_URL ?? "http://localhost:3000"}/dashboard" style="display: inline-block; background: #2563EB; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Dashboard</a></p>
        <p style="color: #6B7280; font-size: 13px;">— AuditReadyCPD</p>
      </div>
    `,
  };
}

export function importCompleteEmail(name: string, sourceName: string, recordCount: number): EmailOptions {
  return {
    to: "",
    subject: `Transcript import complete: ${recordCount} records from ${sourceName}`,
    text: [
      `Hi ${name},`,
      "",
      `Your transcript import from ${sourceName} is complete.`,
      `${recordCount} CPD records have been added to your account.`,
      "",
      "Review your records:",
      `${process.env.BASE_URL ?? "http://localhost:3000"}/dashboard`,
      "",
      "— AuditReadyCPD",
    ].join("\n"),
  };
}

export function certificateIssuedEmail(name: string, activityTitle: string, certCode: string, verifyUrl: string): EmailOptions {
  return {
    to: "",
    subject: `Certificate issued: ${activityTitle}`,
    text: [
      `Hi ${name},`,
      "",
      `A certificate has been issued for: ${activityTitle}`,
      `Certificate ID: ${certCode}`,
      "",
      `Verify: ${verifyUrl}`,
      "",
      "— AuditReadyCPD",
    ].join("\n"),
  };
}

export function emailVerificationEmail(name: string, token: string): EmailOptions {
  const url = `${process.env.BASE_URL ?? "http://localhost:3000"}/auth/verify?token=${token}`;
  return {
    to: "",
    subject: "Verify your email address",
    text: [
      `Hi ${name || "there"},`,
      "",
      "Please verify your email address by clicking the link below:",
      url,
      "",
      "This link expires in 24 hours.",
      "",
      "— AuditReadyCPD",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1B2A4A;">Verify your email</h2>
        <p>Hi ${name || "there"},</p>
        <p>Please verify your email address to complete your registration.</p>
        <p><a href="${url}" style="display: inline-block; background: #2563EB; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify Email</a></p>
        <p style="color: #6B7280; font-size: 13px;">This link expires in 24 hours.</p>
        <p style="color: #6B7280; font-size: 13px;">— AuditReadyCPD</p>
      </div>
    `,
  };
}

export function passwordResetEmail(name: string, token: string): EmailOptions {
  const url = `${process.env.BASE_URL ?? "http://localhost:3000"}/auth/reset-password?token=${token}`;
  return {
    to: "",
    subject: "Reset your password",
    text: [
      `Hi ${name || "there"},`,
      "",
      "We received a request to reset your password.",
      "Click the link below to set a new password:",
      url,
      "",
      "This link expires in 1 hour. If you didn't request this, ignore this email.",
      "",
      "— AuditReadyCPD",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1B2A4A;">Reset your password</h2>
        <p>Hi ${name || "there"},</p>
        <p>We received a request to reset your password. Click below to set a new one:</p>
        <p><a href="${url}" style="display: inline-block; background: #2563EB; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a></p>
        <p style="color: #6B7280; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        <p style="color: #6B7280; font-size: 13px;">— AuditReadyCPD</p>
      </div>
    `,
  };
}
