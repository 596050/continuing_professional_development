/**
 * Push Notification Send Utility
 *
 * Sends push notifications to users via their stored push subscription.
 * Uses native fetch (no external npm packages required).
 */

import { prisma } from "@/lib/db";

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

interface PushResult {
  sent: boolean;
  error?: string;
}

/**
 * Send a push notification to a user.
 *
 * Looks up the user's pushSubscription from the database.
 * If one exists, sends an HTTP POST to the subscription endpoint
 * with the notification payload.
 */
export async function sendPushNotification(payload: PushPayload): Promise<PushResult> {
  try {
    // Look up the user's push subscription
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { pushSubscription: true },
    });

    if (!user) {
      return { sent: false, error: "User not found" };
    }

    if (!user.pushSubscription) {
      return { sent: false, error: "No push subscription registered for user" };
    }

    // Parse the subscription JSON
    let subscription: { endpoint: string; keys?: { p256dh?: string; auth?: string } };
    try {
      subscription = JSON.parse(user.pushSubscription);
    } catch {
      return { sent: false, error: "Invalid push subscription format" };
    }

    if (!subscription.endpoint) {
      return { sent: false, error: "Push subscription missing endpoint" };
    }

    // Build the notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      icon: payload.icon ?? "/icons/icon-192.svg",
      tag: `notification-${Date.now()}`,
    });

    // Send the push notification via HTTP POST to the subscription endpoint
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(Buffer.byteLength(notificationPayload)),
        // TTL header is required by Web Push protocol (time to live in seconds)
        TTL: "86400",
      },
      body: notificationPayload,
    });

    if (response.ok || response.status === 201) {
      return { sent: true };
    }

    // Handle common error status codes
    if (response.status === 404 || response.status === 410) {
      // Subscription has expired or is no longer valid - clean it up
      await prisma.user.update({
        where: { id: payload.userId },
        data: { pushSubscription: null },
      });
      return { sent: false, error: "Push subscription expired or invalid" };
    }

    return {
      sent: false,
      error: `Push service returned status ${response.status}`,
    };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Failed to send push notification",
    };
  }
}
