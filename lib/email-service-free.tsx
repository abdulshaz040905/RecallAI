import MeetingSummaryEmailNew from '@/app/components/email/meeting-summary'
import { render } from '@react-email/render'
import nodemailer from 'nodemailer'

interface EmailData {
    userEmail: string
    userName: string
    meetingTitle: string
    summary: string
    actionItems: Array<{
        id: number
        text: string
    }>
    meetingId: string
    meetingDate: string
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
})

export async function sendMeetingSummaryEmail(data: EmailData) {
    try {
        const emailHtml = await render(
            <MeetingSummaryEmailNew
                userName={data.userName}
                meetingTitle={data.meetingTitle}
                summary={data.summary}
                actionItems={data.actionItems}
                meetingId={data.meetingId}
                meetingDate={data.meetingDate}
            />
        )

        const result = await transporter.sendMail({
            from: `"Meeting Bot" <${process.env.GMAIL_USER}>`,
            to: data.userEmail,
            subject: `Meeting Summary Ready - ${data.meetingTitle}`,
            html: emailHtml
        })

        return result
    } catch (error) {
        console.error('error saendign email:', error)
        throw error
    }
}
interface WorkspaceInviteEmail {
    to: string
    workspaceName: string
    inviterName: string
    role: string
    url: string
}

/**
 * Workspace invitation email. Kept as inline HTML (rather than a react-email
 * component) so it renders identically in clients that strip <style> blocks.
 */
export async function sendWorkspaceInviteEmail(data: WorkspaceInviteEmail) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('Email is not configured (GMAIL_USER / GMAIL_APP_PASSWORD)')
    }

    const html = `
    <div style="background:#07070a;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#101018;border:1px solid #23232e;border-radius:20px;padding:36px;">
        <p style="color:#8f8fa3;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 18px;">Recall AI</p>
        <h1 style="color:#f5f5f7;font-size:24px;margin:0 0 14px;">You've been invited to ${data.workspaceName}</h1>
        <p style="color:#a1a1b5;font-size:15px;line-height:1.6;margin:0 0 26px;">
          ${data.inviterName} invited you to join <strong style="color:#f5f5f7;">${data.workspaceName}</strong>
          on Recall AI as a <strong style="color:#f5f5f7;">${data.role.toLowerCase()}</strong>.
          You'll get access to the workspace's meeting recordings, transcripts and AI summaries.
        </p>
        <a href="${data.url}"
           style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:13px 26px;border-radius:12px;font-weight:600;font-size:15px;">
          Accept invitation
        </a>
        <p style="color:#6b6b80;font-size:12px;line-height:1.6;margin:26px 0 0;">
          This invite expires in 7 days. If the button doesn't work, paste this link into your browser:<br/>
          <span style="color:#8f8fa3;word-break:break-all;">${data.url}</span>
        </p>
      </div>
    </div>`

    return transporter.sendMail({
        from: `"Recall AI" <${process.env.GMAIL_USER}>`,
        to: data.to,
        subject: `${data.inviterName} invited you to ${data.workspaceName} on Recall AI`,
        html
    })
}
