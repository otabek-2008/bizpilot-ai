type Props = {
  title: string;
  description: string;
};

export default function WorkspaceCard({
  title,
  description,
}: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="text-zinc-500 mt-3">
        {description}
      </p>
    </div>
  );
}
