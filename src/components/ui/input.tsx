import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition focus-visible:border-[var(--input-ring)] focus-visible:ring-0",
      className
    )}
    data-tauri-drag-region="false"
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
