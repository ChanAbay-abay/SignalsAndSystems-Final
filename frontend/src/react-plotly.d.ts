declare module 'react-plotly.js' {
  import * as Plotly from 'plotly.js-dist-min'
  import * as React from 'react'

  interface PlotParams {
    data: Plotly.Data[]
    layout?: Partial<Plotly.Layout>
    config?: Partial<Plotly.Config>
    style?: React.CSSProperties
    className?: string
    onInitialized?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void
    onUpdate?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void
    onPurge?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void
    onError?: (err: Error) => void
    useResizeHandler?: boolean
    revision?: number
  }

  const Plot: React.FC<PlotParams>
  export default Plot
}
