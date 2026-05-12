import { create } from 'zustand'
import type { TrainingData, AnalysisResult, SampleSignal } from '../types/ecg'

interface ECGState {
  trainingData: TrainingData | null
  analysisResult: AnalysisResult | null
  sampleSignals: SampleSignal[]
  loading: boolean
  analyzing: boolean
  error: string | null

  setTrainingData: (data: TrainingData) => void
  setAnalysisResult: (result: AnalysisResult | null) => void
  setSampleSignals: (samples: SampleSignal[]) => void
  setLoading: (v: boolean) => void
  setAnalyzing: (v: boolean) => void
  setError: (msg: string | null) => void
}

export const useECGStore = create<ECGState>((set) => ({
  trainingData: null,
  analysisResult: null,
  sampleSignals: [],
  loading: false,
  analyzing: false,
  error: null,

  setTrainingData: (data) => set({ trainingData: data }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setSampleSignals: (samples) => set({ sampleSignals: samples }),
  setLoading: (v) => set({ loading: v }),
  setAnalyzing: (v) => set({ analyzing: v }),
  setError: (msg) => set({ error: msg }),
}))
