import * as React from "react";
import { clsx } from "clsx";

export interface KbdProps extends React.HTMLAttributes<HTMLSpanElement> {}

export interface KbdGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Kbd = React.forwardRef<HTMLSpanElement, KbdProps>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={clsx(
      "inline-flex items-center rounded-md border border-border/70 bg-background/60 px-2 py-1 text-[11px] uppercase text-foreground/80",
      className
    )}
    {...props}
  />
));

Kbd.displayName = "Kbd";

export const KbdGroup = React.forwardRef<HTMLDivElement, KbdGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        "inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background/40 px-1 py-1",
        className
      )}
      {...props}
    />
  )
);

KbdGroup.displayName = "KbdGroup";
