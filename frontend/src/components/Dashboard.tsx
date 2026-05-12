import Header from './Header'
import SignalUpload from './SignalUpload'
import ResultsPanel from './ResultsPanel'
import VisualizationGrid from './VisualizationGrid'
import AlgorithmWalkthrough from './AlgorithmWalkthrough'
import { useECGStore } from '../store/ecgStore'

export default function Dashboard() {
  const { loading } = useECGStore()

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-lg">Training on ECG5000...</span>
            <span className="text-sm text-slate-500">Running DBSCAN epsilon sweep — this takes ~5 seconds</span>
          </div>
        )}

        {!loading && (
          <div className="flex flex-col gap-6">
            {/* Top row: sidebar + plots */}
            <div className="flex gap-6">
              {/* Left sidebar */}
              <div className="w-72 shrink-0 flex flex-col gap-4">
                <SignalUpload />
                <ResultsPanel />
              </div>

              {/* Main visualization area */}
              <div className="flex-1 min-w-0">
                <VisualizationGrid />
              </div>
            </div>

            {/* Walkthrough */}
            <AlgorithmWalkthrough />
          </div>
        )}
      </div>
    </div>
  )
}
