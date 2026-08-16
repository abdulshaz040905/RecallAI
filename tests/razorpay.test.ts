import { afterEach, describe, expect, it, vi } from 'vitest'
import crypto from 'crypto'
import {
    validatePaymentVerification,
    validateWebhookSignature
} from 'razorpay/dist/utils/razorpay-utils'

/**
 * These tests check our signature verification against Razorpay's own helper
 * functions rather than against a hand-written expectation, so a wrong operand
 * order — the classic mistake here, since the subscription flow reverses the
 * order used by the one-time-order flow — cannot pass.
 */

const KEY_SECRET = 'test_secret_do_not_use'
const WEBHOOK_SECRET = 'test_webhook_secret'

const ORIGINAL_KEY = process.env.RAZORPAY_KEY_SECRET
const ORIGINAL_WEBHOOK = process.env.RAZORPAY_WEBHOOK_SECRET

afterEach(() => {
    process.env.RAZORPAY_KEY_SECRET = ORIGINAL_KEY
    process.env.RAZORPAY_WEBHOOK_SECRET = ORIGINAL_WEBHOOK
    vi.resetModules()
})

async function load() {
    vi.resetModules()
    return import('@/lib/billing/razorpay')
}

describe('verifySubscriptionSignature', () => {
    const paymentId = 'pay_MtestPayment01'
    const subscriptionId = 'sub_MtestSubscript'

    /** What Razorpay Checkout actually hands the browser. */
    function realSignature() {
        return crypto
            .createHmac('sha256', KEY_SECRET)
            .update(`${paymentId}|${subscriptionId}`)
            .digest('hex')
    }

    it('matches Razorpay’s own validatePaymentVerification helper', () => {
        const signature = realSignature()

        expect(
            validatePaymentVerification(
                { payment_id: paymentId, subscription_id: subscriptionId },
                signature,
                KEY_SECRET
            )
        ).toBe(true)
    })

    it('accepts a genuine signature', async () => {
        process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
        const { verifySubscriptionSignature } = await load()

        expect(
            verifySubscriptionSignature({
                razorpayPaymentId: paymentId,
                razorpaySubscriptionId: subscriptionId,
                razorpaySignature: realSignature()
            })
        ).toBe(true)
    })

    it('rejects a signature built with the operands the wrong way round', async () => {
        process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
        const { verifySubscriptionSignature } = await load()

        const reversed = crypto
            .createHmac('sha256', KEY_SECRET)
            .update(`${subscriptionId}|${paymentId}`)
            .digest('hex')

        expect(
            verifySubscriptionSignature({
                razorpayPaymentId: paymentId,
                razorpaySubscriptionId: subscriptionId,
                razorpaySignature: reversed
            })
        ).toBe(false)
    })

    it('rejects a signature from a different secret', async () => {
        process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
        const { verifySubscriptionSignature } = await load()

        const forged = crypto
            .createHmac('sha256', 'attacker_secret')
            .update(`${paymentId}|${subscriptionId}`)
            .digest('hex')

        expect(
            verifySubscriptionSignature({
                razorpayPaymentId: paymentId,
                razorpaySubscriptionId: subscriptionId,
                razorpaySignature: forged
            })
        ).toBe(false)
    })

    it('rejects a truncated signature instead of throwing', async () => {
        process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
        const { verifySubscriptionSignature } = await load()

        expect(
            verifySubscriptionSignature({
                razorpayPaymentId: paymentId,
                razorpaySubscriptionId: subscriptionId,
                razorpaySignature: 'abc'
            })
        ).toBe(false)
    })

    it('fails closed when the secret is missing', async () => {
        delete process.env.RAZORPAY_KEY_SECRET
        const { verifySubscriptionSignature } = await load()

        expect(
            verifySubscriptionSignature({
                razorpayPaymentId: paymentId,
                razorpaySubscriptionId: subscriptionId,
                razorpaySignature: realSignature()
            })
        ).toBe(false)
    })
})

describe('verifyWebhookSignature', () => {
    const body = JSON.stringify({
        event: 'subscription.charged',
        payload: { subscription: { entity: { id: 'sub_Mtest', plan_id: 'plan_Mtest' } } }
    })

    function realSignature() {
        return crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(body)
            .digest('hex')
    }

    it('agrees with Razorpay’s own validateWebhookSignature helper', () => {
        expect(validateWebhookSignature(body, realSignature(), WEBHOOK_SECRET)).toBe(true)
    })

    it('accepts a genuine webhook', async () => {
        process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
        const { verifyWebhookSignature } = await load()

        expect(verifyWebhookSignature(body, realSignature())).toBe(true)
    })

    it('rejects a body that was tampered with in transit', async () => {
        process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
        const { verifyWebhookSignature } = await load()

        const tampered = body.replace('plan_Mtest', 'plan_Mpremium')
        expect(verifyWebhookSignature(tampered, realSignature())).toBe(false)
    })

    it('rejects a missing signature header', async () => {
        process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
        const { verifyWebhookSignature } = await load()

        expect(verifyWebhookSignature(body, null)).toBe(false)
    })

    it('fails closed when the webhook secret is missing', async () => {
        delete process.env.RAZORPAY_WEBHOOK_SECRET
        const { verifyWebhookSignature } = await load()

        expect(verifyWebhookSignature(body, realSignature())).toBe(false)
    })
})
