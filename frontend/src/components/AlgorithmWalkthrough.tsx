import { useState } from 'react'
import Plot from './Plot'
import InfoTooltip from './InfoTooltip'
import { useECGStore } from '../store/ecgStore'

const PLOT_BG = '#1e293b'
const PAPER_BG = '#1e293b'
const FONT_COLOR = '#94a3b8'
const GRID_COLOR = '#334155'

const baseLayout = {
  plot_bgcolor: PLOT_BG,
  paper_bgcolor: PAPER_BG,
  font: { color: FONT_COLOR, size: 11 },
  margin: { t: 20, b: 80, l: 55, r: 20 },
  xaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
  yaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
  height: 340,
  legend: {
    orientation: 'h',
    yanchor: 'top',
    y: -0.22,
    xanchor: 'center',
    x: 0.5,
    font: { color: FONT_COLOR, size: 11 },
    bgcolor: 'rgba(0,0,0,0)',
    borderwidth: 0,
  },
}

const STEPS = [
  { label: 'Upload' },
  { label: 'Filtered' },
  { label: 'Features' },
  { label: 'Clustering' },
  { label: 'Result' },
]

const STEP_INFO = [
  'This is the heartbeat signal exactly as it was recorded — completely unprocessed. The tall spike in the middle is the QRS complex (the main heartbeat event). You may notice some slow drift or noise mixed into the signal, which is what the next step cleans up.',
  'A bandpass filter (0.5–40 Hz) is applied to clean the signal. It removes slow baseline drift (caused by breathing or movement) and high-frequency electrical noise, keeping only the medically relevant heartbeat frequencies. The cleaned signal is shown in blue; the original is faded behind it for comparison.',
  'The entire signal is compressed into just two numbers. R² measures how similar this heartbeat\'s shape is to the mean normal template — 1 means a perfect match, 0 means completely different. Variance measures the signal\'s overall energy or amplitude spread. Together, these two numbers place this heartbeat on the cluster map in the next step.',
  'The star shows exactly where this heartbeat sits on the 2D feature map. The model classifies it by measuring which cluster centroid — Normal or Irregular — it is closest to, like finding which city on a map you are nearest to. A high R² (far right) almost always means a normal beat; low R² or very different energy pushes it toward the irregular cluster.',
  'The final classification: Normal or Irregular, based on which cluster centroid was closer in the feature space. The R² and Variance values shown below confirm why the model made its decision. For sample signals, the ground truth label is also shown so you can see whether the model classified it correctly.',
]

function StepSection({ info, children }: { info: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-end gap-1.5 mb-2 text-slate-500 text-xs">
        <span>How to read this</span>
        <InfoTooltip text={info} />
      </div>
      {children}
    </div>
  )
}

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
    <StepSection key="raw" info={STEP_INFO[0]}>
      <Plot
        data={[{ x, y: rawSig, type: 'scatter', mode: 'lines', line: { color: '#94a3b8' }, name: 'Raw ECG' }]}
        layout={{ ...baseLayout, xaxis: { ...baseLayout.xaxis, title: 'Sample' }, yaxis: { ...baseLayout.yaxis, title: 'Amplitude' } }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%' }}
      />
    </StepSection>,
    // Step 1: Filtered
    <StepSection key="filt" info={STEP_INFO[1]}>
      <Plot
        data={[
          { x, y: rawSig, type: 'scatter', mode: 'lines', line: { color: '#475569', width: 1 }, name: 'Raw', opacity: 0.4 },
          { x, y: filtSig, type: 'scatter', mode: 'lines', line: { color: '#38bdf8', width: 2 }, name: 'Filtered' },
        ]}
        layout={{ ...baseLayout, xaxis: { ...baseLayout.xaxis, title: 'Sample' }, yaxis: { ...baseLayout.yaxis, title: 'Amplitude' } }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%' }}
      />
    </StepSection>,
    // Step 2: Features
    <StepSection key="feat" info={STEP_INFO[2]}>
      <div className="text-slate-200 space-y-3 py-2 px-2">
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
      </div>
    </StepSection>,
    // Step 3: Clustering context
    <StepSection key="cluster" info={STEP_INFO[3]}>
      <Plot
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
      />
    </StepSection>,
    // Step 4: Result
    <StepSection key="result" info={STEP_INFO[4]}>
      <div className="py-4 text-center space-y-4">
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
      </div>
    </StepSection>,
  ]

  return (
    <div className="bg-slate-800 rounded-xl p-5">
      <h2 className="text-white font-semibold text-lg mb-4">Algorithm Walkthrough</h2>

      {/* Step tabs */}
      <div className="flex gap-1 mb-4">
        {STEPS.map(({ label }, i) => (
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

      <div className="min-h-80">{content[step]}</div>

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
