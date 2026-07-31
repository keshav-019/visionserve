import { queryOptions } from "@tanstack/react-query";
import {
  auditLogs,
  incidents,
  invitations,
  limitSettings,
  notifications,
  retentionPolicies,
  storageObjects,
  systemComponents,
  systemBuild,
  teamMembers,
  webhookDeliveries,
  webhooks,
  workspace,
  currentUser,
} from "@/mocks/data";
import { respond } from "./client";

export const notificationsQueryOptions = () =>
  queryOptions({ queryKey: ["notifications"], queryFn: () => respond(notifications) });

export const teamQueryOptions = () =>
  queryOptions({
    queryKey: ["team"],
    queryFn: () => respond({ members: teamMembers, invitations }),
  });

export const auditLogsQueryOptions = () =>
  queryOptions({ queryKey: ["audit-logs"], queryFn: () => respond(auditLogs) });

export const storageQueryOptions = () =>
  queryOptions({
    queryKey: ["storage"],
    queryFn: () => respond({ objects: storageObjects, policies: retentionPolicies }),
  });

export const systemHealthQueryOptions = () =>
  queryOptions({
    queryKey: ["system-health"],
    queryFn: () => respond({ components: systemComponents, incidents, build: systemBuild }),
  });

export const webhooksQueryOptions = () =>
  queryOptions({ queryKey: ["webhooks"], queryFn: () => respond(webhooks) });

export const webhookDeliveriesQueryOptions = (webhookId: string) =>
  queryOptions({
    queryKey: ["webhooks", webhookId, "deliveries"],
    queryFn: () => respond(webhookDeliveries.filter((d) => d.webhookId === webhookId)),
  });

export const limitsQueryOptions = () =>
  queryOptions({ queryKey: ["limits"], queryFn: () => respond(limitSettings) });

export const workspaceQueryOptions = () =>
  queryOptions({ queryKey: ["workspace"], queryFn: () => respond({ workspace, currentUser }) });
