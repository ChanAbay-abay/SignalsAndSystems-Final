export interface EpsSweepData {
  eps_values: number[]
  dbi_scores: number[]
  best_eps: number
}

export interface NormalTemplateData {
  mean_signal: number[]
  normal_signals_sample: number[][]
}

export interface ClusterData {
  r_squared: number[]
  variance: number[]
  labels: number[]
  normal_cluster_label: number | null
}

export interface MorphologyData {
  mean_normal: number[]
  sample_irregular: number[]
}

export interface RSquaredStripData {
  normal: number[]
  irregular: number[]
}

export interface Metrics {
  accuracy: number
  precision: number
  recall: number
  f1: number
  confusion_matrix: number[][]
}

export interface TrainingData {
  eps_sweep: EpsSweepData
  normal_template: NormalTemplateData
  r_squared_distribution: { values: number[] }
  clusters: ClusterData
  morphology: MorphologyData
  r_squared_strip: RSquaredStripData
  metrics: Metrics
  best_eps: number
}

export interface AnalysisResult {
  labels: number[]
  features: number[][]
  normal_cluster_label: number | null
  signals_raw: number[][]
  signals_filtered: number[][]
  predictions: number[]
  metrics?: Metrics
  ground_truth?: number[]
  source: 'upload' | 'sample' | 'manual'
  filename?: string
  sample_name?: string
}

export interface SampleSignal {
  id: number
  name: string
  ground_truth: string
}
