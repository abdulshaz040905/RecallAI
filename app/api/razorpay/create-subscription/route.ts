import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/lib/billing/razorpay";
import { serverPlanId, type PlanId } from "@/lib/billing/plans";

const VALID_PLANS: PlanId[] = ["starter", "pro", "premium"];

/**
 * Creates a Razorpay subscription and hands the id back to the browser, which
 * opens Checkout with it.
 *
 * The plan id comes from the server's own config, never from the request body
 * — the client sends a plan *name* ("pro") and we look up what that costs. A
 * client that posts `{ plan: 'premium' }` still gets charged the premium price.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const plan = body?.plan as PlanId | undefined;

    if (!plan || !VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const razorpayPlanId = serverPlanId(plan);

    if (!razorpayPlanId) {
      return NextResponse.json(
        {
          error: `No Razorpay plan configured for "${plan}". Create the plan in the Razorpay dashboard and set RAZORPAY_${plan.toUpperCase()}_PLAN_ID.`,
        },
        { status: 500 },
      );
    }

    let dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: userId,
          clerkId: userId,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
        },
      });
    }

    const client = razorpay();

    // Razorpay ties a subscription to a customer only via notes unless one
    // is created up front; we create it once and reuse it so the dashboard
    // shows a single customer per user rather than one per checkout.
    let customerId = dbUser.razorpayCustomerId;

    if (!customerId) {
      try {
        const customer = await client.customers.create({
          name:
            user.fullName ||
            user.primaryEmailAddress?.emailAddress ||
            "Recall user",
          email: user.primaryEmailAddress?.emailAddress ?? undefined,
          fail_existing: 0,
          notes: { clerkUserId: userId, dbUserId: dbUser.id },
        });

        customerId = customer.id;

        await prisma.user.update({
          where: { id: dbUser.id },
          data: { razorpayCustomerId: customerId },
        });
      } catch (error) {
        // Razorpay already has a customer for this email from an earlier
        // attempt. Nothing downstream needs the id — the subscription is
        // created without it — so log and carry on rather than break checkout.
        console.warn("razorpay customer create skipped:", error);
      }
    }

    const subscription = await client.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_notify: 1,
      // 12 monthly charges, then Razorpay stops. Renew or raise as needed.
      total_count: 12,
      quantity: 1,
      notes: {
        clerkUserId: userId,
        dbUserId: dbUser.id,
        planName: plan,
      },
    });

    // Recorded now so the webhook can find this user even if the browser
    // never makes it back to our verify endpoint.
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { razorpaySubscriptionId: subscription.id },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      prefill: {
        name: user.fullName ?? "",
        email: user.primaryEmailAddress?.emailAddress ?? "",
      },
    });
  } catch (error) {
    console.error("razorpay subscription error:", error);
    return NextResponse.json(
      { error: "Could not start checkout" },
      { status: 500 },
    );
  }
}
