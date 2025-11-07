-- CreateTable
CREATE TABLE "HR_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationTime" TEXT NOT NULL DEFAULT '09:00',
    "leaveStartReminderDays" INTEGER NOT NULL DEFAULT 1,
    "leaveEndReminderDays" INTEGER NOT NULL DEFAULT 1,
    "sectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" BIGINT
);
