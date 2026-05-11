import Link from "next/link";
import { db } from "@/lib/db";
import { LogList } from "@/components/log-list";

type PageProps = {
  params: { id: string };
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const project = await db.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, description: true },
  });

  if (!project) {
    return <div className="w-full">Project not found.</div>;
  }

  return (
    <div className="w-full space-y-4">
      <div className="text-sm text-muted-foreground">
        <Link href="/projects" className="hover:underline">
          Projects
        </Link>{" "}
        / {project.name}
      </div>
      <div>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-sm text-muted-foreground">{project.description || "No description"}</p>
      </div>
      <LogList projectId={project.id} />
    </div>
  );
}
