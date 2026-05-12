import { useEffect, useRef } from 'react'
import Plotly from 'plotly.js-dist-min'

interface PlotProps {
  data: Plotly.Data[]
  layout?: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
  style?: React.CSSProperties
}

export default function Plot({ data, layout = {}, config = {}, style }: PlotProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    Plotly.react(ref.current, data, { autosize: true, ...layout }, config)
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const ro = new ResizeObserver(() => { Plotly.Plots.resize(el) })
    ro.observe(el)

    return () => {
      ro.disconnect()
      Plotly.purge(el)
    }
  }, [])

  return <div ref={ref} style={{ width: '100%', ...style }} />
}
