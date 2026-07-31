import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { DescriptionList } from "@/components/shared/description-list";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { limitsQueryOptions, workspaceQueryOptions } from "@/services/misc";
import { formatDate } from "@/lib/format";
import type { Environment } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — VisionServe" },
      {
        name: "description",
        content: "Workspace profile, platform limits, and administrative controls.",
      },
      { property: "og:title", content: "Settings — VisionServe" },
      {
        property: "og:description",
        content: "Workspace profile, platform limits, and administrative controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(limitsQueryOptions());
    void context.queryClient.ensureQueryData(workspaceQueryOptions());
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { data: limits } = useSuspenseQuery(limitsQueryOptions());
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions());
  const { workspace, currentUser } = workspaceData;

  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(limits.map((l) => [l.id, l.value])),
  );
  const dirty = useMemo(() => limits.some((l) => values[l.id] !== l.value), [limits, values]);

  const categories = useMemo(() => [...new Set(limits.map((l) => l.category))], [limits]);

  const resetAll = () => setValues(Object.fromEntries(limits.map((l) => [l.id, l.value])));

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Settings"
        description="Workspace profile and platform limits. Limit changes apply to new jobs immediately."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <SectionCard title="Workspace">
            <DescriptionList
              columns={1}
              items={[
                { term: "Name", value: workspace.name },
                { term: "Slug", value: workspace.slug, mono: true },
                { term: "Region", value: workspace.region, mono: true },
                { term: "Plan", value: workspace.plan },
                { term: "Default environment", value: workspace.defaultEnvironment, mono: true },
              ]}
            />
            <Separator className="my-4" />
            <div className="space-y-1.5">
              <Label htmlFor="default-env">Default environment</Label>
              <Select
                defaultValue={workspace.defaultEnvironment}
                onValueChange={() => toast.success("Default environment updated")}
              >
                <SelectTrigger id="default-env">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["production", "staging", "development"] as Environment[]).map((env) => (
                    <SelectItem key={env} value={env}>
                      {env}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SectionCard>

          <SectionCard title="Your account">
            <DescriptionList
              columns={1}
              items={[
                { term: "Name", value: currentUser.name },
                { term: "Email", value: currentUser.email, mono: true },
                { term: "Role", value: currentUser.role },
                { term: "Title", value: currentUser.jobTitle },
              ]}
            />
          </SectionCard>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            title="Platform limits"
            description={
              dirty ? "You have unsaved changes" : "All values match the deployed configuration"
            }
            actions={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={!dirty}
                  onClick={resetAll}
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  Reset
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!dirty}
                  onClick={() =>
                    toast.success("Limits saved", {
                      description: "New values apply to jobs submitted from now on.",
                    })
                  }
                >
                  <Save className="size-3.5" aria-hidden />
                  Save changes
                </Button>
              </div>
            }
          >
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category}>
                  <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {limits
                      .filter((l) => l.category === category)
                      .map((l) => {
                        const value = values[l.id];
                        const warn = l.warnAbove !== undefined && value > l.warnAbove;
                        const changed = value !== l.value;
                        return (
                          <div
                            key={l.id}
                            className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_140px]"
                          >
                            <div>
                              <Label htmlFor={`limit-${l.id}`} className="text-xs font-medium">
                                {l.label}
                              </Label>
                              <p className="text-[11px] text-muted-foreground">{l.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`limit-${l.id}`}
                                type="number"
                                min={l.min}
                                max={l.max}
                                value={value}
                                onChange={(e) =>
                                  setValues((prev) => ({ ...prev, [l.id]: Number(e.target.value) }))
                                }
                                className={`h-8 font-mono text-xs font-tnum ${changed ? "border-primary" : ""}`}
                              />
                              <span className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground">
                                {l.unit}
                                {warn && (
                                  <span className="mt-0.5 flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="size-2.5" aria-hidden />
                                    high
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Danger zone">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Delete workspace</p>
                <p className="text-xs text-muted-foreground">
                  Removes all models, results, and keys. Retained audit logs are anonymized after 30
                  days.
                </p>
              </div>
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" size="sm">
                    Delete workspace
                  </Button>
                }
                title="Delete this workspace?"
                description="This permanently removes all models, results, API keys, and deployments. There is no undo."
                confirmLabel="Delete everything"
                onConfirm={() =>
                  toast.error("Workspace deletion scheduled", {
                    description: "A confirmation email was sent to the owner.",
                  })
                }
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
