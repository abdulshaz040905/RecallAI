const key = process.env.MEETING_BAAS_API_KEY
const webhook = process.env.WEBHOOK_URL

console.log('key len     :', key?.length)
console.log('WEBHOOK_URL :', webhook ?? '*** UNDEFINED ***')

const res = await fetch('https://api.meetingbaas.com/bots', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-meeting-baas-api-key': key
    },
    body: JSON.stringify({
        meeting_url: 'meet.google.com/sgx-pkan-yhk',   // ← your real Meet link
        bot_name: 'Test Bot',
        reserved: false,
        recording_mode: 'speaker_view',
        speech_to_text: { provider: 'Default' },
        webhook_url: webhook
    }),
    signal: AbortSignal.timeout(30000)
})

console.log('\nstatus:', res.status)
console.log('body  :', await res.text())