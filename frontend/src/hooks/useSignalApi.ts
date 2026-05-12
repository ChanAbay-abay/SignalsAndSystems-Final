import { useECGStore } from '../store/ecgStore'
import type { TrainingData, AnalysisResult, SampleSignal } from '../types/ecg'

const BASE = '/api'

export function useSignalApi() {
  const { setTrainingData, setAnalysisResult, setSampleSignals, setLoading, setAnalyzing, setError } =
    useECGStore()

  async function fetchTrainingData() {
    setLoading(true)
    setError(null)

    // Retry for up to 60s while backend is still training on startup
    const MAX_ATTEMPTS = 30
    const DELAY_MS = 2000
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(`${BASE}/training-data`)
        if (res.ok) {
          const data: TrainingData = await res.json()
          setTrainingData(data)
          setLoading(false)
          return
        }
        // 502 = backend still booting; anything else is a real error
        if (res.status !== 502 && res.status !== 503 && res.status !== 504) {
          throw new Error(`Server error ${res.status}`)
        }
      } catch (e) {
        if (attempt === MAX_ATTEMPTS) {
          setError(e instanceof Error ? e.message : 'Failed to load training data')
          setLoading(false)
          return
        }
      }
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }

    setLoading(false)
  }

  async function fetchSampleSignals() {
    try {
      const res = await fetch(`${BASE}/sample-signals`)
      if (!res.ok) return
      const data: SampleSignal[] = await res.json()
      setSampleSignals(data)
    } catch {
      // non-critical
    }
  }

  async function uploadFile(file: File) {
    setAnalyzing(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/analyze`, { method: 'POST', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      const result: AnalysisResult = await res.json()
      setAnalysisResult(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function analyzeSample(sampleId: number) {
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_id: sampleId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      const result: AnalysisResult = await res.json()
      setAnalysisResult(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  return { fetchTrainingData, fetchSampleSignals, uploadFile, analyzeSample }
}
