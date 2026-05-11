import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ProjectCardProps = {
  id: string;
  name: string;
  description?: string | null;
  logCount: number;
  onEdit: () => void;
  onDelete: () => void;
};

export function ProjectCard({
  id,
  name,
  description,
  logCount,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description || "No description"}</p>
        <p className="mt-2 text-xs">{logCount} logs</p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link
          href={`/projects/${id}`}
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
        >
          Open
        </Link>
        <Button variant="outline" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
