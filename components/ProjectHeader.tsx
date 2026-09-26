"use client";

type Props = {
  title: string;
};

export default function ProjectHeader({ title }: Props) {
  return (
    <header className="border-b border-zinc-800 px-8 py-6 flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">
          {title}
        </h1>

        <p className="text-zinc-500 mt-2">
          AI Powered Business Workspace
        </p>
      </div>

      <button className="bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-lg">
        Generate AI
      </button>
    </header>
  );
}
