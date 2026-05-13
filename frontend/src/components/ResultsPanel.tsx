import React from 'react'
import { useECGStore } from '../store/ecgStore'
import type { Metrics } from '../types/ecg'

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-700 rounded-lg p-4 text-center">
      <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-white font-bold text-2xl mt-1">{(value * 100).toFixed(1)}%</p>
    </div>
  )
}

function ConfusionMatrix({ cm }: { cm: number[][] }) {
  const labels = ['Irregular', 'Normal']
  return (
    <div className="mt-4">
      <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Confusion Matrix</p>
      <div className="grid grid-cols-3 gap-1 text-xs">
        <div />
        {labels.map((l) => (
          <div key={l} className="text-center text-slate-400 font-medium py-1">
            Pred {l}
          </div>
        ))}
        {cm.map((row, ri) => (
          <React.Fragment key={ri}>
            <div className="text-slate-400 font-medium flex items-center">
              True {labels[ri]}
            </div>
            {row.map((val, ci) => (
              <div
                key={ci}
                className={`text-center py-2 rounded font-bold ${
                  ri === ci ? 'bg-blue-700 text-white' : 'bg-slate-600 text-slate-300'
                }`}
              >
                {val}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function MetricsBlock({ metrics, title }: { metrics: Metrics; title: string }) {
  return (
    <div className="bg-slate-700/50 rounded-xl p-5 space-y-4">
      <h3 className="text-white font-semibold text-base">{title}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

  if (!trainMetrics && !analysisResult) return null

  return (
    <div className="bg-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-white font-semibold text-lg">Results</h2>
        {analysisResult && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
            <span className="text-slate-400">
              Source:{' '}
              <span className="text-slate-200">
                {analysisResult.filename ?? analysisResult.sample_name ?? analysisResult.source}
              </span>
            </span>
            <span className="text-slate-400">
              Signals: <span className="text-slate-200">{totalCount}</span>
            </span>
            <span className="text-blue-400 font-semibold">Normal: {normalCount}</span>
            <span className="text-red-400 font-semibold">Irregular: {totalCount - normalCount}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {uploadMetrics ? (
          <MetricsBlock metrics={uploadMetrics} title="Upload Metrics" />
        ) : (
          <div className="bg-slate-700/30 rounded-xl p-5 flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-600">
            Upload or select a sample to see metrics
          </div>
        )}
        {trainMetrics && (
          <MetricsBlock metrics={trainMetrics} title="Training Set Metrics" />
        )}
      </div>
    </div>
  )
}
