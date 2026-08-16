import Razorpay from "razorpay";
import crypto from "crypto";

let client: Razorpay | null = null;

export function razorpay(): Razorpay {
  if (!client) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    console.log("Razorpay Key ID:", key_id);
    console.log("Razorpay Secret exists:", !!key_secret);

    if (!key_id || !key_secret) {
      throw new Error(
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
      );
    }

    client = new Razorpay({
      key_id,
      key_secret,
    });
  }

  return client;
}

export function isTestMode(): boolean {
  return (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_test_");
}

export function verifySubscriptionSignature({
  razorpayPaymentId,
  razorpaySubscriptionId,
  razorpaySignature,
}: {
  razorpayPaymentId: string;
  razorpaySubscriptionId: string;
  razorpaySignature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
    .digest("hex");

  return safeEqual(expected, razorpaySignature);
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");

  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}