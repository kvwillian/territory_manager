export function PlaceholderPage({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="px-8 py-7">
      <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">{body}</p>
    </div>
  )
}
