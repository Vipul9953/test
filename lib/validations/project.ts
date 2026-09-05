import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(40),
});
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectListSchema = z.object({
  projects: z.array(ProjectSchema),
});
