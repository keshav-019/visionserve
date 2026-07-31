import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = true,
  requireTyped,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  /** When set, the user must type this exact value to enable confirmation. */
  requireTyped?: string;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(false);
  const blocked = requireTyped !== undefined && typed !== requireTyped;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTyped("");
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {requireTyped !== undefined && (
          <div className="space-y-2">
            <Label htmlFor="confirm-typed" className="text-xs text-muted-foreground">
              Type <span className="font-mono font-medium text-foreground">{requireTyped}</span> to
              confirm
            </Label>
            <Input
              id="confirm-typed"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireTyped}
              className="font-mono"
              autoComplete="off"
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={blocked}
            onClick={onConfirm}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
