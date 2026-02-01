/**
 * Webhook Delivery Utility
 *
 * Handles delivery of webhook events to registered endpoints.
 * Signs payloads with HMAC-SHA256 and manages failure tracking.
 */

import crypto from "crypto";
import { prisma } from "@/lib/db";

const MAX_CONSECUTIVE_FAILURES = 10;

/**
 * Sign a payload with HMAC-SHA256 using the webhook secret.
 */
export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Deliver a webhook event to all active endpoints for a firm that subscribe
 * to the given event type.
 *
 * - Finds all active webhook endpoints for the firm
 * - Filters by event subscription
 * - Sends a signed POST request to each endpoint
 * - Tracks delivery success/failure
 * - Deactivates endpoints after MAX_CONSECUTIVE_FAILURES consecutive failures
 */
export async function deliverWebhook(
  firmId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<{ delivered: number; failed: number }> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { firmId, active: true },
  });

  let delivered = 0;
  let failed = 0;

  for (const endpoint of endpoints) {
    // Check if this endpoint subscribes to this event
    let events: string[] = [];
    try {
      events = JSON.parse(endpoint.events);
    } catch {
      events = [];
    }

    if (!events.includes(event)) continue;

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = signPayload(body, endpoint.secret);

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10_000), // 10-second timeout
      });

      if (response.ok) {
        // Success: reset fail count and update last delivery
        await prisma.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: {
            lastDelivery: new Date(),
            failCount: 0,
          },
        });
        delivered++;
      } else {
        // HTTP error
        await handleFailure(endpoint.id, endpoint.failCount);
        failed++;
      }
    } catch {
      // Network error or timeout
      await handleFailure(endpoint.id, endpoint.failCount);
      failed++;
    }
  }

  return { delivered, failed };
}

/**
 * Handle a delivery failure by incrementing the fail count and
 * deactivating the endpoint if it exceeds the maximum.
 */
async function handleFailure(
  endpointId: string,
  currentFailCount: number
): Promise<void> {
  const newFailCount = currentFailCount + 1;

  await prisma.webhookEndpoint.update({
    where: { id: endpointId },
    data: {
      failCount: newFailCount,
      active: newFailCount < MAX_CONSECUTIVE_FAILURES,
    },
  });
}
