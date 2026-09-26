import ProjectSidebar from "@/components/ProjectSidebar";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex bg-[#09090b] text-white">
      <ProjectSidebar />
      <main className="flex-1 min-h-screen">{children}</main>
    </div>
  );
}
