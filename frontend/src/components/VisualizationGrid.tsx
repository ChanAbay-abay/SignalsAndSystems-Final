import Plot from './Plot'
import InfoTooltip from './InfoTooltip'
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
  margin: { t: 40, b: 90, l: 55, r: 20 },
  xaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
  yaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
  legend: {
    orientation: 'h',
    yanchor: 'top',
    y: -0.18,
    xanchor: 'center',
    x: 0.5,
    font: { color: FONT_COLOR, size: 11 },
    bgcolor: 'rgba(0,0,0,0)',
    borderwidth: 0,
  },
}

const GRAPH_INFO: Record<string, string> = {
  ksweep: `The model needs to decide how many groups (clusters) to split the heartbeats into. It tries every value of K from 2 to 10 and scores each using the Silhouette Score — a measure of how well-separated the groups are. A score closer to 1 means the clusters are tight and distinct; closer to 0 means they overlap. The red dashed line marks the K with the best score, which is used for all clustering.`,

  template: `This is the "reference heartbeat" the model uses. It is built by averaging all normal (healthy) training beats together. The blue line is that average — a smooth, typical ECG wave showing the P-wave, QRS complex, and T-wave. The faint grey lines behind it are individual normal beats. Any new signal is compared against this template to measure how similar it is.`,

  rsqdist: `R² (R-squared, or the coefficient of determination) measures how closely each heartbeat's shape matches the normal template — 1 means a perfect match, 0 means no similarity at all. This histogram shows the spread of R² values across all training signals. If you see two bumps (a bimodal shape), it means normal and irregular beats naturally separate into two groups, which is exactly what the model exploits.`,

  clusters: `Each dot represents one training heartbeat, plotted using its two features: R² similarity (x-axis, higher = more normal-looking) and signal variance/energy (y-axis). Blue dots are the cluster the model identified as Normal; red dots are Irregular. If you upload or select a signal, a star shows where it falls in this space — close to blue means it looks normal, close to red means it looks irregular.`,

  morphology: `A direct side-by-side shape comparison. The solid line is the mean normal heartbeat template. The dashed line is either your uploaded signal or a sample irregular beat. Irregular heartbeats often show differences like a wider or taller QRS spike, a missing P-wave, extra bumps, or a shifted baseline — all visible as a mismatch between the two lines.`,

  rstrip: `This box-and-dot plot shows the full spread of R² similarity scores split by class. Normal beats (blue) should cluster near 1 — they look like the template. Irregular beats (red) scatter lower — they deviate from it. The more separated these two groups are vertically, the more reliably R² alone distinguishes normal from irregular heartbeats. Stars show where an uploaded signal's score lands relative to each group.`,
}


function PlotCard({ title, info, children }: { title: string; info: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-slate-300 font-medium text-sm">{title}</h3>
        <InfoTooltip text={info} />
      </div>
      {children}
    </div>
  )
}

function KSweepPlot({ data }: { data: TrainingData['k_sweep'] }) {
  return (
    <Plot
      data={[
        {
          x: data.k_values,
          y: data.silhouette_scores,
          type: 'scatter',
          mode: 'lines+markers',
          line: { color: '#a855f7', width: 1.5 },
          marker: { size: 6 },
          name: 'Silhouette Score',
        },
        {
          x: [data.best_k, data.best_k],
          y: [Math.min(...data.silhouette_scores), Math.max(...data.silhouette_scores)],
          type: 'scatter',
          mode: 'lines',
          line: { color: '#ef4444', dash: 'dash', width: 2 },
          name: `Optimal K: ${data.best_k}`,
        },
      ]}
      layout={{
        ...baseLayout,
        xaxis: { ...baseLayout.xaxis, title: 'Number of Clusters (K)', dtick: 1 },
        yaxis: { ...baseLayout.yaxis, title: 'Silhouette Score' },
        height: 460,
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
        height: 460,
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
        height: 460,
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
        height: 460,
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
        height: 460,
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
        height: 460,
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PlotCard title="1. Hyperparameter Sweep: Silhouette Score vs K" info={GRAPH_INFO.ksweep}>
        <KSweepPlot data={trainingData.k_sweep} />
      </PlotCard>

      <PlotCard title="2. Normal Database Template" info={GRAPH_INFO.template}>
        <NormalTemplatePlot data={trainingData.normal_template} />
      </PlotCard>

      <PlotCard title="3. R² Similarity Distribution" info={GRAPH_INFO.rsqdist}>
        <RSquaredHistogram values={trainingData.r_squared_distribution.values} />
      </PlotCard>

      <PlotCard title="4. Hierarchical Clusters (R² vs Variance)" info={GRAPH_INFO.clusters}>
        <ClustersScatterPlot data={trainingData.clusters} analysisResult={analysisResult} />
      </PlotCard>

      <PlotCard title="5. Morphology Comparison" info={GRAPH_INFO.morphology}>
        <MorphologyPlot data={trainingData.morphology} analysisResult={analysisResult} />
      </PlotCard>

      <PlotCard title="6. R² Values: Normal vs Irregular" info={GRAPH_INFO.rstrip}>
        <RSquaredStripPlot data={trainingData.r_squared_strip} analysisResult={analysisResult} />
      </PlotCard>
    </div>
  )
}
