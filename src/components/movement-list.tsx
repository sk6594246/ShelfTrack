import { formatDistanceToNow } from "date-fns";
import type { Movement } from "@/lib/inventory/types";

export function MovementList({ items }: { items: Movement[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No movements yet.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-2xl bg-card shadow-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.productName}</p>
            <p className="text-xs text-muted-foreground">
              {labelFor(item.type)}
              {item.note ? ` · ${item.note}` : ""}
              {" · "}
              {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
            </p>
          </div>
          <span
            className={
              item.delta > 0
                ? "font-mono text-sm tabular-nums text-ok"
                : item.delta < 0
                  ? "font-mono text-sm tabular-nums text-destructive"
                  : "font-mono text-sm tabular-nums text-muted-foreground"
            }
          >
            {item.delta > 0 ? "+" : ""}
            {item.delta}
          </span>
        </li>
      ))}
    </ul>
  );
}

function labelFor(type: Movement["type"]) {
  if (type === "receive") return "Received";
  if (type === "pick") return "Picked";
  if (type === "adjust") return "Counted";
  return "Added";
}
