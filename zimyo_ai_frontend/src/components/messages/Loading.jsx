/**
 * Loading — renders ui.type === "loading"
 *
 * Skeleton loader that matches the shape of the expected content.
 * Spec: skeleton ("form" | "card" | "table" | "checklist" | "generic"), message?
 */

const SKELETONS = {
  form: () => (
    <div className="space-y-3">
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3 animate-pulse" />
      <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
      <div className="flex gap-2">
        <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex-1 animate-pulse" />
        <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex-1 animate-pulse" />
      </div>
      <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
      <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3 animate-pulse" />
    </div>
  ),

  card: () => (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-1/3 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-1/4 animate-pulse" />
            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  ),

  table: () => (
    <div className="space-y-2">
      <div className="flex gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded flex-1 animate-pulse" />
        ))}
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4 py-1.5">
          {[1, 2, 3].map((j) => (
            <div key={j} className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded flex-1 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  ),

  checklist: () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse shrink-0" />
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded flex-1 animate-pulse" />
        </div>
      ))}
    </div>
  ),

  generic: () => (
    <div className="space-y-2.5">
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 animate-pulse" />
      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-full animate-pulse" />
      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-5/6 animate-pulse" />
      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-3/4 animate-pulse" />
    </div>
  ),
}

export default function Loading({ msg }) {
  const { skeleton = 'generic', message } = msg
  const Skeleton = SKELETONS[skeleton] || SKELETONS.generic

  return (
    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 w-full max-w-md mt-2 animate-fade-in">
      {message && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
          {message}
        </p>
      )}
      <Skeleton />
    </div>
  )
}
