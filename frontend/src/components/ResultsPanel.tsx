import { useECGStore } from '../store/ecgStore'
import type { Metrics } from '../types/ecg'

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-700 rounded-lg p-3 text-center">
      <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-white font-bold text-xl mt-1">{(value * 100).toFixed(1)}%</p>
    </div>
  )
}

function ConfusionMatrix({ cm }: { cm: number[][] }) {
  const labels = ['Irregular', 'Normal']
  return (
    <div className="mt-3">
      <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Confusion Matrix</p>
      <div className="grid grid-cols-3 gap-1 text-xs">
        <div />
        {labels.map((l) => (
          <div key={l} className="text-center text-slate-400 font-medium">
            Pred {l}
          </div>
        ))}
        {cm.map((row, ri) => (
          <>
            <div key={`lbl-${ri}`} className="text-slate-400 font-medium flex items-center">
              True {labels[ri]}
            </div>
            {row.map((val, ci) => (
              <div
                key={ci}
                className={`text-center py-2 rounded font-bold ${
                  ri === ci ? 'bg-blue-700 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {val}
              </div>
            ))}
          </>
        ))}
      </div>
    </div>
  )
}

function MetricsBlock({ metrics, title }: { metrics: Metrics; title: string }) {
  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Accuracy" value={metrics.accuracy} />
        <MetricCard label="Precision" value={metrics.precision} />
        <MetricCard label="Recall" value={metrics.recall} />
        <MetricCard label="F1-Score" value={metrics.f1} />
      </div>
      <ConfusionMatrix cm={metrics.confusion_matrix} />
    </div>
  )
}

export default function ResultsPanel() {
  const { trainingData, analysisResult } = useECGStore()

  const trainMetrics = trainingData?.metrics
  const uploadMetrics = analysisResult?.metrics
  const predictions = analysisResult?.predictions
  const normalCount = predictions?.filter((p) => p === 1).length ?? 0
  const totalCount = predictions?.length ?? 0

  return (
    <div className="bg-slate-800 rounded-xl p-5 space-y-5">
      <h2 className="text-white font-semibold text-lg">Results</h2>

      {analysisResult && (
        <div className="bg-slate-700 rounded-lg p-4 space-y-1">
          <p className="text-slate-300 text-sm">
            <span className="text-slate-400">Source:</span>{' '}
            {analysisResult.filename ?? analysisResult.sample_name ?? analysisResult.source}
          </p>
          <p className="text-slate-300 text-sm">
            <span className="text-slate-400">Signals:</span> {totalCount}
          </p>
          <p className="text-slate-300 text-sm">
            <span className="text-blue-400 font-semibold">Normal:</span> {normalCount} |{' '}
            <span className="text-red-400 font-semibold">Irregular:</span> {totalCount - normalCount}
          </p>
        </div>
      )}

      {uploadMetrics && (
        <MetricsBlock metrics={uploadMetrics} title="Upload Metrics" />
      )}

      {trainMetrics && (
        <MetricsBlock metrics={trainMetrics} title="Training Set Metrics" />
      )}
    </div>
  )
}
