import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Archivo, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { ClerkProvider } from '@clerk/nextjs'
import { UsageProvider } from './contexts/UsageContext'
import { ConditionalLayout } from './components/conditional-layout'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getAppUrl } from '@/lib/app-url'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
    display: 'swap'
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
    display: 'swap'
})

/** Display face for headlines — tight, wide-weight grotesk. */
const archivo = Archivo({
    variable: '--font-display-face',
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap'
})

/** Italic serif used for the one accented word in a headline. */
const instrumentSerif = Instrument_Serif({
    variable: '--font-serif-face',
    subsets: ['latin'],
    weight: '400',
    style: 'italic',
    display: 'swap'
})

export const metadata: Metadata = {
    // Tolerates an unset or placeholder NEXT_PUBLIC_APP_URL rather than
    // crashing every route with ERR_INVALID_URL.
    metadataBase: getAppUrl(),
    title: {
        default: 'Recall AI — Meeting intelligence that writes itself up',
        template: '%s · Recall AI'
    },
    description:
        'Recall AI joins your Zoom, Meet and Teams calls, records and transcribes them, then delivers summaries, decisions and action items — in 100+ languages, pushed to Notion, Linear, Jira, Salesforce and more.',
    keywords: [
        'meeting notes',
        'AI transcription',
        'meeting summaries',
        'action items',
        'transcript translation'
    ],
    openGraph: {
        title: 'Recall AI — Meeting intelligence that writes itself up',
        description:
            'Automatic recording, transcription, translation and action items for every meeting.',
        type: 'website'
    },
    icons: { icon: '/favicon.ico' }
}

export const viewport: Viewport = {
    themeColor: '#f1f0ee'
}

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <ClerkProvider>
            {/*
              Font variables live on <html> so they resolve at :root — the
              design tokens in globals.css reference them from there.
            */}
            <html
                lang="en"
                suppressHydrationWarning
                className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${instrumentSerif.variable}`}
            >
                <body className="antialiased bg-background text-foreground">
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="light"
                        forcedTheme="light"
                        enableSystem={false}
                        disableTransitionOnChange
                    >
                        <TooltipProvider delayDuration={300}>
                            <UsageProvider>
                                <ConditionalLayout>{children}</ConditionalLayout>
                            </UsageProvider>
                            <Toaster position="bottom-right" richColors />
                        </TooltipProvider>
                    </ThemeProvider>
                </body>
            </html>
        </ClerkProvider>
    )
}
