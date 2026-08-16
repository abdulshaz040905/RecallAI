"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { useMeetings } from "./hooks/useMeetings";
import PastMeetings from "./components/PastMeetings";
import UpcomingMeetings from "./components/UpcomingMeetings";
import {
  PageBody,
  PageHeader,
  SectionHeading,
  Spinner,
} from "../components/page-shell";
import { useUser } from "@clerk/nextjs";

/** One cell of the stat strip. */
function Stat({
  label,
  value,
  hint,
  index,
}: {
  label: string;
  value: string | number;
  hint?: string;
  index: number;
}) {
  return (
    <div className="relative border-b border-line py-6 sm:border-b-0 lg:pl-6 lg:first:pl-0">
      {index > 0 && (
        <span className="absolute left-0 top-0 hidden h-full w-px bg-line lg:block" />
      )}
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-display text-[34px] font-medium leading-none tracking-[-0.04em] tabular-nums">
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-[12px] leading-snug text-ink-faint">{hint}</p>
      )}
    </div>
  );
}

export default function Home() {
  const {
    userId,
    upcomingEvents,
    pastMeetings,
    loading,
    pastLoading,
    connected,
    error,
    botToggles,
    initialLoading,
    fetchUpcomingEvents,
    toggleBot,
    directOAuth,
    getAttendeeList,
    getInitials,
  } = useMeetings();

  const router = useRouter();

  const { user, isLoaded } = useUser();

  const displayName =
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ??
    "there";

  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const botsScheduled = Object.values(botToggles).filter(Boolean).length;
  const transcriptsReady = pastMeetings.filter((m) => m.transcriptReady).length;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={isLoaded ? displayName : ""}
        description="Everything your bot has sat in on, and everything it is about to."
        actions={
          <Link href="/search" className="group">
            <span className="flex h-10 w-full min-w-[15rem] items-center gap-2.5 rounded-full border border-line bg-card px-4 text-[13px] text-ink-faint transition-colors group-hover:border-line-strong">
              <Search className="h-3.5 w-3.5" strokeWidth={1.6} />
              Search all meetings…
            </span>
          </Link>
        }
      />

      <PageBody>
        <div className="mb-10 grid border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            index={0}
            label="Past meetings"
            value={pastMeetings.length}
            hint="Recorded and processed"
          />
          <Stat
            index={1}
            label="Upcoming"
            value={upcomingEvents.length}
            hint={connected ? "Synced from calendar" : "Calendar not connected"}
          />
          <Stat
            index={2}
            label="Bots scheduled"
            value={botsScheduled}
            hint="Will join automatically"
          />
          <Stat
            index={3}
            label="Transcripts ready"
            value={transcriptsReady}
            hint="Searchable and translatable"
          />
        </div>

        <div className="flex flex-col gap-10 xl:flex-row xl:gap-12">
          <section className="min-w-0 flex-1">
            <SectionHeading
              aside={
                <Link
                  href="/search"
                  className="link-underline flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-ink"
                >
                  Search & filter
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              }
            >
              Past meetings
            </SectionHeading>

            <PastMeetings
              pastMeetings={pastMeetings}
              pastLoading={pastLoading}
              onMeetingClick={(id) => router.push(`/meeting/${id}`)}
              getAttendeeList={getAttendeeList}
              getInitials={getInitials}
            />
          </section>

          <aside className="w-full shrink-0 xl:w-[22rem]">
            <div className="xl:sticky xl:top-32">
              <UpcomingMeetings
                upcomingEvents={upcomingEvents}
                connected={connected}
                error={error}
                loading={loading}
                initialLoading={initialLoading}
                botToggles={botToggles}
                onRefresh={fetchUpcomingEvents}
                onToggleBot={toggleBot}
                onConnectCalendar={directOAuth}
              />
            </div>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
