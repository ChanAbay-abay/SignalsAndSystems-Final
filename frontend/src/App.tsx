import { useEffect } from 'react'
import Dashboard from './components/Dashboard'
import { useSignalApi } from './hooks/useSignalApi'

export default function App() {
  const { fetchTrainingData, fetchSampleSignals } = useSignalApi()

  useEffect(() => {
    fetchTrainingData().then(fetchSampleSignals)
  }, [])

  return <Dashboard />
}
