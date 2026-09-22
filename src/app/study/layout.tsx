export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-zinc-100">
      {children}
    </div>
  );
}
