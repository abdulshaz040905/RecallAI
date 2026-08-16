import Razorpay from 'razorpay'
import crypto from 'crypto'

/**
 * Razorpay client.
 *
 * Instantiated lazily so that importing this module during a build — or in a
 * route that never touches billing — doesn't throw when the keys are absent.
 */
let client: Razorpay | null = null

export function razorpay(): Razorpay {
    if (!client) {
        const key_id = process.env.RAZORPAY_KEY_ID
        const key_secret = process.env.RAZORPAY_KEY_SECRET

        if (!key_id || !key_secret) {
            throw new Error(
                'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
            )
        }

        client = new Razorpay({ key_id, key_secret })
    }

    return client
}

/** True when the account keys look like test-mode keys. */
export function isTestMode(): boolean {
    return (process.env.RAZORPAY_KEY_ID ?? '').startsWith('rzp_test')
}

/**
 * Verifies the signature Razorpay Checkout hands back to the browser after a
 * successful subscription payment.
 *
 * The payload is `payment_id + "|" + subscription_id` — note the order is the
 * reverse of the one-time-order flow, which is a very easy thing to get wrong.
 * Compared with `timingSafeEqual` so the check can't be probed byte by byte.
 */
export function verifySubscriptionSignature({
    razorpayPaymentId,
    razorpaySubscriptionId,
    razorpaySignature
}: {
    razorpayPaymentId: string
    razorpaySubscriptionId: string
    razorpaySignature: string
}): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) return false

    const expected = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
        .digest('hex')

    return safeEqual(expected, razorpaySignature)
}

/** Verifies the `x-razorpay-signature` header on an incoming webhook. */
export function verifyWebhookSignature(
    rawBody: string,
    signature: string | null
): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!secret || !signature) return false

    const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')

    return safeEqual(expected, signature)
}

function safeEqual(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, 'utf8')
    const bufferB = Buffer.from(b, 'utf8')

    // timingSafeEqual throws on length mismatch, so guard first.
    if (bufferA.length !== bufferB.length) return false

    return crypto.timingSafeEqual(bufferA, bufferB)
}
