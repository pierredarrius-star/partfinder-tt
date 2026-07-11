// Instant response the moment a navigation lands here — shown while the page's
// code and data are still on the way. Mirrors the Garage layout as a skeleton.
export default function Loading() {
  return (
    <div className="min-h-screen bg-charcoal px-6 pt-8">
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 rounded-lg bg-surface animate-pulse" />
        <div className="h-10 w-10 rounded-full bg-surface animate-pulse" />
      </div>
      <div className="mt-6 h-44 rounded-2xl bg-surface animate-pulse" />
      <div className="mt-3 h-24 rounded-2xl bg-surface animate-pulse" />
      <div className="mt-3 h-24 rounded-2xl bg-surface animate-pulse" />
    </div>
  )
}
