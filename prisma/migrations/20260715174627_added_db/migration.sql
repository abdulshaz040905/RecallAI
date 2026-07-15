-- CreateEnum
CREATE TYPE "IntegrationPlatform" AS ENUM ('google', 'slack', 'jira', 'trello', 'notion', 'asana', 'clickup');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "botName" TEXT DEFAULT 'Meeting Bot',
    "botImageUrl" TEXT,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" TIMESTAMP(3),
    "calendarConnected" BOOLEAN NOT NULL DEFAULT false,
    "slackUserId" TEXT,
    "slackTeamId" TEXT,
    "slackConnected" BOOLEAN NOT NULL DEFAULT false,
    "preferredChannelId" TEXT,
    "preferredChannelName" TEXT,
    "currentPlan" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'inactive',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "billingPeriodStart" TIMESTAMP(3),
    "meetingsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "chatMessagesToday" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackInstallation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "installedBy" TEXT NOT NULL,
    "installerName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meetingUrl" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "attendees" JSONB,
    "calendarEventId" TEXT,
    "isFromCalendar" BOOLEAN NOT NULL DEFAULT false,
    "botScheduled" BOOLEAN NOT NULL DEFAULT true,
    "botSent" BOOLEAN NOT NULL DEFAULT false,
    "botId" TEXT,
    "botJoinedAt" TIMESTAMP(3),
    "meetingEnded" BOOLEAN NOT NULL DEFAULT false,
    "transcriptReady" BOOLEAN NOT NULL DEFAULT false,
    "transcript" JSONB,
    "recordingUrl" TEXT,
    "speakers" JSONB,
    "summary" TEXT,
    "actionItems" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "ragProcessed" BOOLEAN NOT NULL DEFAULT false,
    "ragProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "IntegrationPlatform" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "boardId" TEXT,
    "boardName" TEXT,
    "projectId" TEXT,
    "projectName" TEXT,
    "workspaceId" TEXT,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptChunk" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "speakerName" TEXT,
    "vectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "SlackInstallation_teamId_key" ON "SlackInstallation"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_calendarEventId_key" ON "Meeting"("calendarEventId");

-- CreateIndex
CREATE UNIQUE INDEX "UserIntegration_userId_platform_key" ON "UserIntegration"("userId", "platform");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptChunk" ADD CONSTRAINT "TranscriptChunk_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
