import ProjectTabs from "@/components/ProjectTabs";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <ProjectTabs />
      {children}
    </div>
  );
}
