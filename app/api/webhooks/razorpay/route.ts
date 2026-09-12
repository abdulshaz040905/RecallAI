import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/billing/razorpay";
import { planIdFromRazorpay } from "@/lib/billing/plans";

/**
 * Razorpay subscription webhooks — the authoritative record of what a user is
 * paying for.
 *
 * Enable these events in the Razorpay dashboard (Settings → Webhooks):
 *   subscription.activated, subscription.charged, subscription.halted,
 *   subscription.cancelled, subscription.completed
 *
 * The raw body is read as text before parsing, because the HMAC is computed
 * over the exact bytes Razorpay sent — re-serialising the parsed JSON produces
 * a different string and the signature check fails.
 */

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  status: string;
  notes?: Record<string, string>;
  current_end?: number;
  has_scheduled_changes?: boolean;
  change_scheduled_at?: "now" | "cycle_end";
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const headersList = await headers();
    const signature = headersList.get("x-razorpay-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("razorpay webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const subscription: RazorpaySubscriptionEntity | undefined =
      event?.payload?.subscription?.entity;

    if (!subscription) {
      // Payment-only events carry no subscription; nothing to reconcile.
      return NextResponse.json({ received: true });
    }

    switch (event.event) {
      case "subscription.activated":
      case "subscription.charged":
        await handleActive(subscription);
        break;

      case "subscription.halted":
      case "subscription.pending":
        await handleStatus(subscription, "past_due");
        break;

      case "subscription.cancelled":
      case "subscription.completed":
      case "subscription.expired":
        await handleCancelled(subscription);
        break;

      case "subscription.updated":
        await handleUpdated(subscription);
        break;

      default:
        console.log(`razorpay webhook: unhandled event ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("razorpay webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

/** Finds the user by subscription id, falling back to the notes we attached. */
async function findUser(subscription: RazorpaySubscriptionEntity) {
  const bySubscription = await prisma.user.findFirst({
    where: { razorpaySubscriptionId: subscription.id },
  });

  if (bySubscription) return bySubscription;

  const clerkUserId = subscription.notes?.clerkUserId;
  if (!clerkUserId) return null;

  return prisma.user.findUnique({ where: { clerkId: clerkUserId } });
}

async function handleUpdated(subscription: RazorpaySubscriptionEntity) {
  const user = await findUser(subscription);

  if (!user) {
    console.warn("Razorpay webhook: user not found", subscription.id);
    return;
  }

  const activePlan = planIdFromRazorpay(subscription.plan_id);

  if (!activePlan) {
    console.error("Razorpay webhook: unknown plan", subscription.plan_id);
    return;
  }

  // If true, the downgrade is only scheduled.
  // Keep the current plan active.
  if (subscription.has_scheduled_changes) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        planChangeEffectiveAt: subscription.current_end
          ? new Date(subscription.current_end * 1000)
          : user.planChangeEffectiveAt,
      },
    });

    return;
  }

  // No scheduled changes remain, meaning the new plan is active.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      currentPlan: activePlan,
      subscriptionStatus: "active",
      pendingPlan: null,
      planChangeEffectiveAt: null,
      cancelAtPeriodEnd: false,
    },
  });
}

async function handleActive(subscription: RazorpaySubscriptionEntity) {
  const user = await findUser(subscription);
  if (!user) {
    console.warn("razorpay webhook: no user for subscription", subscription.id);
    return;
  }

  const plan = planIdFromRazorpay(subscription.plan_id);
  if (!plan) {
    console.error("razorpay webhook: unrecognised plan", subscription.plan_id);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      currentPlan: plan,
      subscriptionStatus: "active",
      razorpaySubscriptionId: subscription.id,
      billingPeriodStart: new Date(),
      meetingsThisMonth: 0,
      pendingPlan: null,
      planChangeEffectiveAt: null,
      cancelAtPeriodEnd: false,
    },
  });
}

async function handleStatus(
  subscription: RazorpaySubscriptionEntity,
  status: string,
) {
  const user = await findUser(subscription);
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: status },
  });
}

async function handleCancelled(subscription: RazorpaySubscriptionEntity) {
  const user = await findUser(subscription);
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "cancelled",
      currentPlan: "free",
      pendingPlan: null,
      planChangeEffectiveAt: null,
      cancelAtPeriodEnd: false,
    },
  });
}
