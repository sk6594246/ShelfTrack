import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-lg bg-secondary px-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow] duration-150 placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground shadow-border outline-none transition-[box-shadow] duration-150 placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-11 w-full appearance-none rounded-lg bg-secondary px-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input, Textarea, NativeSelect };
