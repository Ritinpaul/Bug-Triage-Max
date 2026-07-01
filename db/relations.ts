import { relations } from "drizzle-orm";
import {
  users,
  teamMembers,
  messages,
  parsedResults,
  bugReports,
  similarBugMatches,
  reproductionSteps,
  agentActivities,
  integrationStatus,
  analyticsSnapshots,
  releaseNotes,
} from "./schema";

export const usersRelations = relations(users, ({}) => ({}));
export const teamMembersRelations = relations(teamMembers, ({}) => ({}));

export const messagesRelations = relations(messages, ({ one }) => ({
  parsedResult: one(parsedResults, {
    fields: [messages.id],
    references: [parsedResults.messageId],
  }),
  bugReport: one(bugReports, {
    fields: [messages.id],
    references: [bugReports.messageId],
  }),
}));

export const parsedResultsRelations = relations(parsedResults, ({ one }) => ({
  message: one(messages, {
    fields: [parsedResults.messageId],
    references: [messages.id],
  }),
  bugReport: one(bugReports, {
    fields: [parsedResults.id],
    references: [bugReports.parsedResultId],
  }),
}));

export const bugReportsRelations = relations(bugReports, ({ one, many }) => ({
  message: one(messages, {
    fields: [bugReports.messageId],
    references: [messages.id],
  }),
  parsedResult: one(parsedResults, {
    fields: [bugReports.parsedResultId],
    references: [parsedResults.id],
  }),
  reproduction: one(reproductionSteps, {
    fields: [bugReports.id],
    references: [reproductionSteps.bugReportId],
  }),
  similarBugs: many(similarBugMatches),
}));

export const similarBugMatchesRelations = relations(similarBugMatches, ({}) => ({}));
export const reproductionStepsRelations = relations(reproductionSteps, ({}) => ({}));
export const agentActivitiesRelations = relations(agentActivities, ({}) => ({}));
export const integrationStatusRelations = relations(integrationStatus, ({}) => ({}));
export const analyticsSnapshotsRelations = relations(analyticsSnapshots, ({}) => ({}));
export const releaseNotesRelations = relations(releaseNotes, ({}) => ({}));
