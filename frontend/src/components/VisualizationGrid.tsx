import Plot from 'react-plotly.js'
import { useECGStore } from '../store/ecgStore'
import type { TrainingData, AnalysisResult } from '../types/ecg'

const PLOT_BG = '#1e293b'
const PAPER_BG = '#1e293b'
const FONT_COLOR = '#94a3b8'
const GRID_COLOR = '#334155'

const baseLayout: Partial<Plotly.Layout> = {
  plot_bgcolor: PLOT_BG,
  paper_bgcolor: PAPER_BG,
  font: { color: FONT_COLOR, size: 11 },
  margin: { t: 40, b: 50, l: 55, r: 20 },
  xaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
  yaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
}

function PlotCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <h3 className="text-slate-300 font-medium text-sm mb-3">{title}</h3>
      {children}
    </div>
  )
}

function EpsSweepPlot({ data }: { data: TrainingData['eps_sweep'] }) {
  return (
    <Plot
      data={[
        {
          x: data.eps_values,
          y: data.dbi_scores,
          type: 'scatter',
          mode: 'lines',
          line: { color: '#a855f7', width: 1.5 },
          name: 'DBI Score',
        },
        {
          x: [data.best_eps, data.best_eps],
          y: [Math.min(...data.dbi_scores), Math.max(...data.dbi_scores)],
          type: 'scatter',
          mode: 'lines',
          line: { color: '#ef4444', dash: 'dash', width: 2 },
          name: `Best EPS: ${data.best_eps.toFixed(3)}`,
        },
      ]}
      layout={{
        ...baseLayout,
        xaxis: { ...baseLayout.xaxis, title: 'Epsilon' },
        yaxis: { ...baseLayout.yaxis, title: 'Davies-Bouldin Index' },
        legend: { font: { color: FONT_COLOR, size: 10 } },
        height: 240,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  )
}

function NormalTemplatePlot({ data }: { data: TrainingData['normal_template'] }) {
  const x = data.mean_signal.map((_, i) => i)
  return (
    <Plot
      data={[
        ...data.normal_signals_sample.map((sig) => ({
          x,
          y: sig,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: '#94a3b8', width: 0.5 },
          opacity: 0.15,
          showlegend: false,
        })),
        {
          x,
          y: data.mean_signal,
          type: 'scatter',
          mode: 'lines',
          line: { color: '#3b82f6', width: 2.5 },
          name: 'Mean Normal',
        },
      ]}
      layout={{
        ...baseLayout,
        xaxis: { ...baseLayout.xaxis, title: 'Sample Index' },
        yaxis: { ...baseLayout.yaxis, title: 'Amplitude' },
        legend: { font: { color: FONT_COLOR, size: 10 } },
        height: 240,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  )
}

function RSquaredHistogram({ values }: { values: number[] }) {
  return (
    <Plot
      data={[
        {
          x: values,
          type: 'histogram',
          marker: { color: '#38bdf8', opacity: 0.75 },
          nbinsx: 30,
          name: 'R²',
        },
      ]}
      layout={{
        ...baseLayout,
        xaxis: { ...baseLayout.xaxis, title: 'R² (Similarity)' },
        yaxis: { ...baseLayout.yaxis, title: 'Frequency' },
        height: 240,
        bargap: 0.05,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  )
}

function ClustersScatterPlot({
  data,
  analysisResult,
}: {
  data: TrainingData['clusters']
  analysisResult: AnalysisResult | null
}) {
  const normalMask = data.labels.map((l) => l === data.normal_cluster_label)
  const normalR2 = data.r_squared.filter((_, i) => normalMask[i])
  const normalVar = data.variance.filter((_, i) => normalMask[i])
  const irregR2 = data.r_squared.filter((_, i) => !normalMask[i])
  const irregVar = data.variance.filter((_, i) => !normalMask[i])

  const traces: Plotly.Data[] = [
    {
      x: normalR2,
      y: normalVar,
      type: 'scatter',
      mode: 'markers',
      marker: { color: '#3b82f6', size: 5, opacity: 0.7 },
      name: 'Normal (train)',
    },
    {
      x: irregR2,
      y: irregVar,
      type: 'scatter',
      mode: 'markers',
      marker: { color: '#ef4444', size: 5, opacity: 0.7 },
      name: 'Irregular (train)',
    },
  ]

  if (analysisResult) {
    const feat = analysisResult.features
    const preds = analysisResult.predictions
    traces.push({
      x: feat.filter((_, i) => preds[i] === 1).map((f) => f[0]),
      y: feat.filter((_, i) => preds[i] === 1).map((f) => f[1]),
      type: 'scatter',
      mode: 'markers',
      marker: { color: '#22d3ee', size: 8, symbol: 'star', opacity: 0.9 },
      name: 'Upload: Normal',
    })
    traces.push({
      x: feat.filter((_, i) => preds[i] === 0).map((f) => f[0]),
      y: feat.filter((_, i) => preds[i] === 0).map((f) => f[1]),
      type: 'scatter',
      mode: 'markers',
      marker: { color: '#fb923c', size: 8, symbol: 'star', opacity: 0.9 },
      name: 'Upload: Irregular',
    })
  }

  return (
    <Plot
      data={traces}
      layout={{
        ...baseLayout,
        xaxis: { ...baseLayout.xaxis, title: 'R² (Similarity)' },
        yaxis: { ...baseLayout.yaxis, title: 'Variance (Energy)' },
        legend: { font: { color: FONT_COLOR, size: 9 } },
        height: 240,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  )
}

function MorphologyPlot({
  data,
  analysisResult,
}: {
  data: TrainingData['morphology']
  analysisResult: AnalysisResult | null
}) {
  const x = data.mean_normal.map((_, i) => i)
  const traces: Plotly.Data[] = [
    {
      x,
      y: data.mean_normal,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#1d4ed8', width: 2.5 },
      name: 'Normal Template',
    },
  ]

  if (analysisResult && analysisResult.signals_filtered.length > 0) {
    const sig = analysisResult.signals_filtered[0]
    const isNormal = analysisResult.predictions[0] === 1
    traces.push({
      x: sig.map((_, i) => i),
      y: sig,
      type: 'scatter',
      mode: 'lines',
      line: { color: isNormal ? '#22d3ee' : '#ef4444', width: 1.5, dash: 'dash' },
      name: `Uploaded (${isNormal ? 'Normal' : 'Irregular'})`,
    })
  } else if (data.sample_irregular.length > 0) {
    traces.push({
      x: data.sample_irregular.map((_, i) => i),
      y: data.sample_irregular,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#ef4444', width: 1.5, dash: 'dash' },
      name: 'Sample Irregular',
    })
  }

  return (
    <Plot
      data={traces}
      layout={{
        ...baseLayout,
        xaxis: { ...baseLayout.xaxis, title: 'Sample Index' },
        yaxis: { ...baseLayout.yaxis, title: 'Amplitude' },
        legend: { font: { color: FONT_COLOR, size: 10 } },
        height: 240,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  )
}

function RSquaredStripPlot({
  data,
  analysisResult,
}: {
  data: TrainingData['r_squared_strip']
  analysisResult: AnalysisResult | null
}) {
  const traces: Plotly.Data[] = [
    {
      x: Array(data.normal.length).fill('Normal'),
      y: data.normal,
      type: 'box',
      boxpoints: 'all',
      jitter: 0.4,
      pointpos: 0,
      marker: { color: '#3b82f6', size: 3, opacity: 0.6 },
      line: { color: '#3b82f6' },
      name: 'Normal',
    },
    {
      x: Array(data.irregular.length).fill('Irregular'),
      y: data.irregular,
      type: 'box',
      boxpoints: 'all',
      jitter: 0.4,
      pointpos: 0,
      marker: { color: '#ef4444', size: 3, opacity: 0.6 },
      line: { color: '#ef4444' },
      name: 'Irregular',
    },
  ]

  if (analysisResult) {
    const feat = analysisResult.features
    const preds = analysisResult.predictions
    const uploadNormal = feat.filter((_, i) => preds[i] === 1).map((f) => f[0])
    const uploadIrreg = feat.filter((_, i) => preds[i] === 0).map((f) => f[0])
    if (uploadNormal.length > 0)
      traces.push({
        x: Array(uploadNormal.length).fill('Normal'),
        y: uploadNormal,
        type: 'scatter',
        mode: 'markers',
        marker: { color: '#22d3ee', size: 10, symbol: 'star' },
        name: 'Upload',
      })
    if (uploadIrreg.length > 0)
      traces.push({
        x: Array(uploadIrreg.length).fill('Irregular'),
        y: uploadIrreg,
        type: 'scatter',
        mode: 'markers',
        marker: { color: '#fb923c', size: 10, symbol: 'star' },
        name: 'Upload',
        showlegend: false,
      })
  }

  return (
    <Plot
      data={traces}
      layout={{
        ...baseLayout,
        xaxis: { ...baseLayout.xaxis, title: 'Heartbeat Type' },
        yaxis: { ...baseLayout.yaxis, title: 'R² (Similarity)' },
        legend: { font: { color: FONT_COLOR, size: 10 } },
        height: 240,
        showlegend: false,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  )
}

export default function VisualizationGrid() {
  const { trainingData, analysisResult } = useECGStore()

  if (!trainingData) {
    return (
      <div className="text-center py-20 text-slate-500">
        Loading visualizations...
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <PlotCard title="1. Hyperparameter Sweep: DBI vs EPS">
        <EpsSweepPlot data={trainingData.eps_sweep} />
      </PlotCard>

      <PlotCard title="2. Normal Database Template">
        <NormalTemplatePlot data={trainingData.normal_template} />
      </PlotCard>

      <PlotCard title="3. R² Similarity Distribution">
        <RSquaredHistogram values={trainingData.r_squared_distribution.values} />
      </PlotCard>

      <PlotCard title="4. DBSCAN Clusters (R² vs Variance)">
        <ClustersScatterPlot data={trainingData.clusters} analysisResult={analysisResult} />
      </PlotCard>

      <PlotCard title="5. Morphology Comparison">
        <MorphologyPlot data={trainingData.morphology} analysisResult={analysisResult} />
      </PlotCard>

      <PlotCard title="6. R² Values: Normal vs Irregular">
        <RSquaredStripPlot data={trainingData.r_squared_strip} analysisResult={analysisResult} />
      </PlotCard>
    </div>
  )
}
