import { useState } from 'react'

export default function InfoTooltip({ text, align = 'left' }: { text: string; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="w-4 h-4 rounded-full bg-slate-600 hover:bg-blue-600 flex items-center justify-center text-slate-300 text-[10px] font-bold leading-none cursor-help transition-colors select-none"
        tabIndex={-1}
      >
        i
      </button>
      {open && (
        <div className={`absolute bottom-full mb-2 w-72 p-3 bg-slate-700 border border-slate-500 rounded-lg text-xs text-slate-200 leading-relaxed z-50 shadow-2xl pointer-events-none ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {text}
          <div className={`absolute top-full border-4 border-transparent border-t-slate-500 ${align === 'right' ? 'right-3' : 'left-3'}`} />
        </div>
      )}
    </div>
  )
}
