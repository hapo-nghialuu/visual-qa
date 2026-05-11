"use client";

import { useEffect, useState } from "react";
import { ProjectCard } from "@/components/project-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  _count: { comparisons: number };
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/projects");
    if (!response.ok) return;
    const data = (await response.json()) as { projects: Project[] };
    setProjects(data.projects);
  }

  useEffect(() => {
    load();
  }, []);

  async function createProject() {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (!response.ok) return;
    setName("");
    setDescription("");
    await load();
  }

  async function updateProject(id: string) {
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: project.name,
        description: project.description,
      }),
    });
    setEditingId(null);
    await load();
  }

  async function removeProject(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="w-full space-y-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize comparison logs by product, feature, or release.
            </p>
          </div>
          <Dialog>
            <DialogTrigger>
              <Button>New Project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
                <Input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Description"
                />
                <Button onClick={createProject}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="Create your first project" description="Projects help categorize comparison logs." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="space-y-2">
              {editingId === project.id ? (
                <div className="rounded border p-3">
                  <Input
                    value={project.name}
                    onChange={(event) =>
                      setProjects((prev) =>
                        prev.map((item) =>
                          item.id === project.id ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Input
                    className="mt-2"
                    value={project.description ?? ""}
                    onChange={(event) =>
                      setProjects((prev) =>
                        prev.map((item) =>
                          item.id === project.id
                            ? { ...item, description: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <Button className="mt-2" onClick={() => updateProject(project.id)}>
                    Save
                  </Button>
                </div>
              ) : (
                <ProjectCard
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  logCount={project._count.comparisons}
                  onEdit={() => setEditingId(project.id)}
                  onDelete={() => removeProject(project.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
