import { useState } from 'react'
import Plot from 'react-plotly.js'
import { useECGStore } from '../store/ecgStore'

const PLOT_BG = '#1e293b'
const PAPER_BG = '#1e293b'
const FONT_COLOR = '#94a3b8'
const GRID_COLOR = '#334155'

const baseLayout: Partial<Plotly.Layout> = {
  plot_bgcolor: PLOT_BG,
  paper_bgcolor: PAPER_BG,
  font: { color: FONT_COLOR, size: 11 },
  margin: { t: 20, b: 50, l: 55, r: 20 },
  xaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
  yaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
  height: 220,
}

const STEPS = ['Upload', 'Filtered', 'Features', 'Clustering', 'Result']

export default function AlgorithmWalkthrough() {
  const [step, setStep] = useState(0)
  const { analysisResult } = useECGStore()

  if (!analysisResult) {
    return (
      <div className="bg-slate-800 rounded-xl p-5">
        <h2 className="text-white font-semibold text-lg mb-2">Algorithm Walkthrough</h2>
        <p className="text-slate-500 text-sm">Upload or select a sample signal to see the step-by-step analysis.</p>
      </div>
    )
  }

  const rawSig = analysisResult.signals_raw[0] ?? []
  const filtSig = analysisResult.signals_filtered[0] ?? []
  const feat = analysisResult.features[0] ?? [0, 0]
  const pred = analysisResult.predictions[0]
  const isNormal = pred === 1
  const x = rawSig.map((_, i) => i)

  const content = [
    // Step 0: Raw signal
    <Plot
      key="raw"
      data={[{ x, y: rawSig, type: 'scatter', mode: 'lines', line: { color: '#94a3b8' }, name: 'Raw ECG' }]}
      layout={{ ...baseLayout, xaxis: { ...baseLayout.xaxis, title: 'Sample' }, yaxis: { ...baseLayout.yaxis, title: 'Amplitude' } }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />,
    // Step 1: Filtered
    <Plot
      key="filt"
      data={[
        { x, y: rawSig, type: 'scatter', mode: 'lines', line: { color: '#475569', width: 1 }, name: 'Raw', opacity: 0.4 },
        { x, y: filtSig, type: 'scatter', mode: 'lines', line: { color: '#38bdf8', width: 2 }, name: 'Filtered' },
      ]}
      layout={{ ...baseLayout, xaxis: { ...baseLayout.xaxis, title: 'Sample' }, yaxis: { ...baseLayout.yaxis, title: 'Amplitude' }, legend: { font: { color: FONT_COLOR } } }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />,
    // Step 2: Features
    <div key="feat" className="text-slate-200 space-y-3 py-4 px-2">
      <p className="text-sm text-slate-400">Pearson correlation against the mean normal template:</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-700 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-xs uppercase">R² (Similarity)</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{feat[0].toFixed(4)}</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-xs uppercase">Variance (Energy)</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{feat[1].toFixed(4)}</p>
        </div>
      </div>
    </div>,
    // Step 3: Clustering context
    <Plot
      key="cluster"
      data={[
        {
          x: [feat[0]],
          y: [feat[1]],
          type: 'scatter',
          mode: 'markers',
          marker: { color: isNormal ? '#22d3ee' : '#ef4444', size: 16, symbol: 'star' },
          name: 'This signal',
        },
      ]}
      layout={{
        ...baseLayout,
        xaxis: { ...baseLayout.xaxis, title: 'R² (Similarity)', range: [0, 1] },
        yaxis: { ...baseLayout.yaxis, title: 'Variance' },
        legend: { font: { color: FONT_COLOR } },
        annotations: [{
          x: feat[0], y: feat[1],
          text: isNormal ? 'Normal' : 'Irregular',
          showarrow: true, arrowcolor: FONT_COLOR,
          font: { color: isNormal ? '#22d3ee' : '#ef4444', size: 12 },
          bgcolor: PLOT_BG,
        }],
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />,
    // Step 4: Result
    <div key="result" className="py-6 text-center space-y-4">
      <div className={`inline-block px-8 py-4 rounded-2xl text-3xl font-bold ${
        isNormal ? 'bg-blue-900/50 text-blue-300 border border-blue-600' : 'bg-red-900/50 text-red-300 border border-red-600'
      }`}>
        {isNormal ? 'Normal' : 'Irregular'}
      </div>
      <p className="text-slate-400 text-sm">
        R² = {feat[0].toFixed(4)} | Variance = {feat[1].toFixed(4)}
      </p>
      {analysisResult.ground_truth && (
        <p className="text-slate-500 text-xs">
          Ground truth: {analysisResult.ground_truth[0] === 1 ? 'Normal' : 'Irregular'} &mdash;{' '}
          {analysisResult.ground_truth[0] === pred ? '✓ Correct' : '✗ Incorrect'}
        </p>
      )}
    </div>,
  ]

  return (
    <div className="bg-slate-800 rounded-xl p-5">
      <h2 className="text-white font-semibold text-lg mb-4">Algorithm Walkthrough</h2>

      {/* Step tabs */}
      <div className="flex gap-1 mb-4">
        {STEPS.map((label, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
              step === i
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="min-h-[220px]">{content[step]}</div>

      {/* Navigation */}
      <div className="flex justify-between mt-3">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-3 py-1 rounded bg-slate-700 text-slate-300 text-sm disabled:opacity-30 hover:bg-slate-600"
        >
          ← Back
        </button>
        <button
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
          className="px-3 py-1 rounded bg-slate-700 text-slate-300 text-sm disabled:opacity-30 hover:bg-slate-600"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
