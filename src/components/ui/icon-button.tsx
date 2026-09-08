import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@/lib/utils";

export function IconButton({ className, ...props }: ButtonPrimitive.Props) {
  return (
    <ButtonPrimitive
      data-slot="icon-button"
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-5",
        className,
      )}
      {...props}
    />
  );
}
