import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="w-full space-y-4">
      <Skeleton className="h-10 w-60" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
