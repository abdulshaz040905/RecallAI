import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

export default function Page() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-paper px-5 py-16">
            <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink font-display text-[13px] font-semibold text-paper">
                    R
                </span>
                <span className="font-display text-[15px] font-medium tracking-[-0.03em]">
                    Recall
                </span>
            </Link>

            <SignUp
                appearance={{
                    variables: {
                        colorPrimary: '#121110',
                        colorBackground: '#ffffff',
                        colorText: '#121110',
                        colorTextSecondary: '#56534e',
                        borderRadius: '0.75rem'
                    },
                    elements: {
                        rootBox: 'w-full max-w-[26rem]',
                        card: 'shadow-none border border-line rounded-[var(--radius)]',
                        formButtonPrimary: 'rounded-full normal-case text-[13px]'
                    }
                }}
            />
        </div>
    )
}
