"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Project = { id: string; name: string };

type ProjectSelectorProps = {
  value?: string;
  onChange: (projectId: string) => void;
};

export function ProjectSelector({ value, onChange }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadProjects() {
    const response = await fetch("/api/projects");
    if (!response.ok) return;
    const data = (await response.json()) as { projects: Project[] };
    setProjects(data.projects);
    if (!value && data.projects[0]) {
      onChange(data.projects[0].id);
    }
  }

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createProject() {
    if (!newProjectName.trim()) return;
    setLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName }),
      });
      if (!response.ok) return;
      setNewProjectName("");
      await loadProjects();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Select
        value={value}
        onValueChange={(projectId) => {
          if (!projectId) return;
          onChange(projectId);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Input
          placeholder="New project"
          value={newProjectName}
          onChange={(event) => setNewProjectName(event.target.value)}
        />
        <Button disabled={loading} type="button" onClick={createProject}>
          Add
        </Button>
      </div>
    </div>
  );
}
