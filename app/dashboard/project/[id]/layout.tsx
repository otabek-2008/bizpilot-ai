import ProjectSidebar from "@/components/ProjectSidebar";
import Backdrop from "@/components/Backdrop";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col text-white lg:flex-row">
      <Backdrop />
      <ProjectSidebar />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
