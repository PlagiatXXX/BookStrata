export function Sidebar() {
  return (
    <aside
      className="hidden lg:flex w-80 flex-col border-l border-surface-border bg-surface-dark"
      aria-label="Editor sidebar"
    >
      <div className="p-6 border-b border-surface-border">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Управление строками
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6" />

      <div className="p-6 border-t border-surface-border">
        <button className="w-full h-12 rounded-lg bg-primary text-white font-bold">
          Поделиться и экспортировать
        </button>
      </div>
    </aside>
  )
}
