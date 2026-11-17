export function PlaceholderPage({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">{body}</p>
    </div>
  )
}
