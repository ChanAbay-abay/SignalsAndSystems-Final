import { useRef, useState, type DragEvent } from 'react'
import { useSignalApi } from '../hooks/useSignalApi'
import { useECGStore } from '../store/ecgStore'

export default function SignalUpload() {
  const { uploadFile, analyzeSample } = useSignalApi()
  const { sampleSignals, analyzing, error } = useECGStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    uploadFile(files[0])
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="bg-slate-800 rounded-xl p-5">
      <h2 className="text-white font-semibold text-lg mb-4">Analyze Signal</h2>

      <div className="flex gap-6">
        {/* Left: sample signals */}
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-xs mb-3 uppercase tracking-wide">Sample signals</p>
          {sampleSignals.length > 0 ? (
            <div className="flex gap-2">
              {[sampleSignals.slice(0, 5), sampleSignals.slice(5)].map((col, ci) => (
                <div key={ci} className="flex-1 flex flex-col gap-2">
                  {col.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => analyzeSample(s.id)}
                      disabled={analyzing}
                      className="text-left px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-200 transition-colors disabled:opacity-50"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Loading samples...</p>
          )}
        </div>

        {/* Right: upload */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <div
            className={`flex-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
              dragOver ? 'border-blue-400 bg-blue-950/30' : 'border-slate-600 hover:border-slate-400'
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <p className="text-slate-300 text-sm">
              Drop <span className="font-mono text-blue-400">.arff</span> or{' '}
              <span className="font-mono text-blue-400">.csv</span> file here
            </p>
            <p className="text-slate-500 text-xs mt-1">or click to browse</p>
            <input
              ref={inputRef}
              type="file"
              accept=".arff,.csv,.txt"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {analyzing && (
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Analyzing signal...
            </div>
          )}

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
