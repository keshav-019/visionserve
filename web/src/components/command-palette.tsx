import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Boxes,
  FlaskConical,
  Gauge,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListChecks,
  Moon,
  PieChart,
  Rocket,
  Sun,
  Monitor,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useUiStore } from "@/lib/store";
import { jobsQueryOptions } from "@/services/jobs";
import { modelsQueryOptions } from "@/services/models";
import { StatusBadge } from "@/components/shared/status-badge";

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const setTheme = useUiStore((s) => s.setTheme);
  const navigate = useNavigate();

  const { data: modelList } = useQuery(modelsQueryOptions());
  const { data: jobList } = useQuery(jobsQueryOptions());

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, models, jobs, actions…" />
      <CommandList>
        <CommandEmpty>No matches found.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => go("/")}>
            <LayoutDashboard aria-hidden /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/playground")}>
            <FlaskConical aria-hidden /> Playground
            <CommandShortcut>run inference</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/jobs")}>
            <ListChecks aria-hidden /> Jobs
          </CommandItem>
          <CommandItem onSelect={() => go("/batches")}>
            <Layers aria-hidden /> Batches
          </CommandItem>
          <CommandItem onSelect={() => go("/models")}>
            <Boxes aria-hidden /> Model registry
          </CommandItem>
          <CommandItem onSelect={() => go("/deployments")}>
            <Rocket aria-hidden /> Deployments
          </CommandItem>
          <CommandItem onSelect={() => go("/metrics")}>
            <Activity aria-hidden /> Metrics
          </CommandItem>
          <CommandItem onSelect={() => go("/usage")}>
            <PieChart aria-hidden /> Usage &amp; quotas
          </CommandItem>
          <CommandItem onSelect={() => go("/api-keys")}>
            <KeyRound aria-hidden /> API keys
          </CommandItem>
          <CommandItem onSelect={() => go("/benchmarks")}>
            <Gauge aria-hidden /> Benchmarks
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Models">
          {(modelList ?? []).map((m) => (
            <CommandItem
              key={m.id}
              value={`model ${m.id} ${m.name} ${m.task}`}
              onSelect={() => go(`/models/${m.id}`)}
            >
              <Boxes aria-hidden />
              {m.name}
              <span className="ml-2">
                <StatusBadge status={m.status} />
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Jobs">
          {(jobList ?? []).slice(0, 8).map((j) => (
            <CommandItem
              key={j.id}
              value={`job ${j.id} ${j.inputFile}`}
              onSelect={() => go(`/jobs/${j.id}`)}
            >
              <ListChecks aria-hidden />
              <span className="font-mono text-xs">{j.id}</span>
              <span className="ml-2">
                <StatusBadge status={j.status} />
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setTheme("light");
              setOpen(false);
            }}
          >
            <Sun aria-hidden /> Switch to light theme
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setTheme("dark");
              setOpen(false);
            }}
          >
            <Moon aria-hidden /> Switch to dark theme
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setTheme("system");
              setOpen(false);
            }}
          >
            <Monitor aria-hidden /> Use system theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
