// Instant response the moment a navigation lands here — shown while the page's
// code and data are still on the way. Mirrors the Maintenance layout.
export default function Loading() {
  return (
    <div className="min-h-screen bg-charcoal px-6 pt-8">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-surface animate-pulse" />
        <div className="h-6 w-40 rounded-lg bg-surface animate-pulse" />
      </div>
      <div className="mt-6 h-24 rounded-xl bg-surface animate-pulse" />
      <div className="mt-3 h-24 rounded-xl bg-surface animate-pulse" />
      <div className="mt-3 h-16 rounded-xl bg-surface animate-pulse" />
    </div>
  )
}
