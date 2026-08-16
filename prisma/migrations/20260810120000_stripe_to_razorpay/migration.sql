-- Billing moves from Stripe to Razorpay.
--
-- Written as renames rather than drop-and-add so that any rows already in the
-- table keep their data instead of being silently blanked. The stored values
-- are Stripe ids and are meaningless to Razorpay, so they are cleared in a
-- second step — but the columns themselves carry over cleanly.

ALTER TABLE "User" RENAME COLUMN "stripeCustomerId" TO "razorpayCustomerId";
ALTER TABLE "User" RENAME COLUMN "stripeSubscriptionId" TO "razorpaySubscriptionId";

-- Old Stripe identifiers can't be used against Razorpay; drop the values and
-- put everyone back on the free tier so nobody keeps paid limits without an
-- active Razorpay subscription behind them.
UPDATE "User"
SET "razorpayCustomerId"     = NULL,
    "razorpaySubscriptionId" = NULL,
    "currentPlan"            = 'free',
    "subscriptionStatus"     = 'inactive'
WHERE "razorpayCustomerId" IS NOT NULL
   OR "razorpaySubscriptionId" IS NOT NULL;

-- One subscription belongs to exactly one user; the webhook looks users up by
-- this column, so a duplicate would make that lookup ambiguous.
CREATE UNIQUE INDEX "User_razorpaySubscriptionId_key"
    ON "User"("razorpaySubscriptionId");
