export default function Header() {
  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          ECG Anomaly Detection System
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Unsupervised DBSCAN clustering with Pearson correlation features — ECG5000 dataset
        </p>
      </div>
    </header>
  )
}
