interface Props {
  title: string
  message?: string
  action?: string
  onAction?: () => void
  loading?: boolean
}

export default function StatusPanel({ title, message, action, onAction, loading = false }: Props) {
  return <section className={`status-panel${loading ? ' is-loading' : ''}`} role={loading ? 'status' : undefined}>
    {loading && <span className="loader" aria-hidden="true" />}
    <h2>{title}</h2>
    {message && <p>{message}</p>}
    {action && onAction && <button type="button" className="button button-outline" onClick={onAction}>{action}</button>}
  </section>
}
