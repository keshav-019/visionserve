import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { JsonView } from "@/components/shared/json-view";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { webhooksQueryOptions, webhookDeliveriesQueryOptions } from "@/services/misc";
import { formatMs, formatPercent, formatRelative } from "@/lib/format";
import type { Webhook, WebhookDelivery } from "@/lib/types";

export const Route = createFileRoute("/webhooks")({
  head: () => ({
    meta: [
      { title: "Webhooks — VisionServe" },
      {
        name: "description",
        content:
          "Configure webhook endpoints, inspect signed deliveries, and replay failed events.",
      },
      { property: "og:title", content: "Webhooks — VisionServe" },
      {
        property: "og:description",
        content: "Configure webhook endpoints and inspect deliveries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(webhooksQueryOptions());
  },
  component: WebhooksPage,
});

const webhookColumns: ColumnDef<Webhook, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "endpoint",
    header: "Endpoint",
    cell: ({ row }) => (
      <span className="max-w-56 truncate font-mono text-[11px] text-muted-foreground">
        {row.original.endpoint}
      </span>
    ),
  },
  {
    accessorKey: "events",
    header: "Events",
    cell: ({ row }) => (
      <span className="font-mono text-[11px] text-muted-foreground">
        {row.original.events.slice(0, 2).join(", ")}
        {row.original.events.length > 2 ? ` +${row.original.events.length - 2}` : ""}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.status === "failing" ? "failed" : row.original.status} />
    ),
  },
  {
    accessorKey: "failureRate",
    header: "Failures",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-tnum">{formatPercent(row.original.failureRate)}</span>
    ),
  },
  {
    accessorKey: "lastDeliveryAt",
    header: "Last delivery",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.lastDeliveryAt ? formatRelative(row.original.lastDeliveryAt) : "never"}
      </span>
    ),
  },
];

function WebhooksPage() {
  const { data: webhooks, isLoading } = useSuspenseQuery(webhooksQueryOptions());
  const [selectedId, setSelectedId] = useState<string | undefined>(webhooks[0]?.id);
  const [payloadView, setPayloadView] = useState<WebhookDelivery | null>(null);

  const deliveriesQuery = useQuery({
    ...webhookDeliveriesQueryOptions(selectedId ?? webhooks[0]?.id ?? "none"),
    enabled: Boolean(selectedId ?? webhooks[0]?.id),
  });
  const deliveries = deliveriesQuery.data ?? [];

  const deliveryColumns: ColumnDef<WebhookDelivery, unknown>[] = [
    {
      accessorKey: "event",
      header: "Event",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">{row.original.event}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "HTTP",
      cell: ({ row }) => (
        <span
          className={`font-mono text-xs font-tnum ${row.original.success ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "attempts",
      header: "Attempts",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-tnum">{row.original.attempts}</span>
      ),
    },
    {
      accessorKey: "durationMs",
      header: "Duration",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-tnum">{formatMs(row.original.durationMs)}</span>
      ),
    },
    {
      accessorKey: "deliveredAt",
      header: "Delivered",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatRelative(row.original.deliveredAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setPayloadView(row.original)}
          >
            <Eye className="size-3.5" aria-hidden />
            Payload
          </Button>
          {!row.original.success && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() =>
                toast.success("Delivery replayed", {
                  description: `Event ${row.original.event} was re-queued.`,
                })
              }
            >
              <Send className="size-3.5" aria-hidden />
              Replay
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Webhooks"
        description="Signed HTTP callbacks for job, batch, and deployment events."
        actions={
          <Button
            size="sm"
            onClick={() =>
              toast.success("Webhook created", {
                description: "The signing secret was generated — store it securely.",
              })
            }
          >
            <Plus className="size-4" aria-hidden />
            Add endpoint
          </Button>
        }
      />

      <DataTable
        columns={webhookColumns}
        data={webhooks}
        isLoading={isLoading}
        searchPlaceholder="Search webhooks…"
        getRowId={(w) => w.id}
        onRowClick={(w) => setSelectedId(w.id)}
        emptyTitle="No webhooks"
        emptyDescription="Add an endpoint to receive event notifications."
      />

      <SectionCard
        title="Deliveries"
        description="Delivery attempts for the selected endpoint"
        actions={
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-8 w-56 text-xs" aria-label="Select webhook">
              <SelectValue placeholder="Select webhook" />
            </SelectTrigger>
            <SelectContent>
              {webhooks.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <DataTable
          columns={deliveryColumns}
          data={deliveries}
          isLoading={deliveriesQuery.isLoading}
          searchable={false}
          getRowId={(d) => d.id}
          emptyTitle="No deliveries yet"
          emptyDescription="Deliveries appear after the first matching event fires."
        />
      </SectionCard>

      <Dialog open={Boolean(payloadView)} onOpenChange={(open) => !open && setPayloadView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-sm">
              {payloadView?.event}
              {payloadView && (
                <CopyButton
                  value={JSON.stringify(payloadView.payload, null, 2)}
                  aria-label="Copy payload"
                />
              )}
            </DialogTitle>
            <DialogDescription>
              {payloadView && (
                <>
                  Attempt {payloadView.attempts} · HTTP {payloadView.status} ·{" "}
                  {formatRelative(payloadView.deliveredAt)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {payloadView && <JsonView data={payloadView.payload} title="payload.json" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
