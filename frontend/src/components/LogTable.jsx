const LEVEL_CLASS = {
  INFO: 'level-info',
  WARNING: 'level-warning',
  ERROR: 'level-error',
  CRITICAL: 'level-critical',
};

export default function LogTable({
  logs,
  filters,
  onFilterChange,
  pagination,
  onPageChange,
  loading,
}) {
  return (
    <div className="panel">
      <h2>Log explorer</h2>

      <div className="filters">
        <select
          value={filters.service}
          onChange={(e) => onFilterChange({ ...filters, service: e.target.value })}
        >
          <option value="">All services</option>
          <option value="web-server">web-server</option>
          <option value="database-service">database-service</option>
          <option value="auth-service">auth-service</option>
          <option value="api-gateway">api-gateway</option>
          <option value="background-worker">background-worker</option>
        </select>

        <select
          value={filters.level}
          onChange={(e) => onFilterChange({ ...filters, level: e.target.value })}
        >
          <option value="">All levels</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>

        <input
          type="text"
          placeholder="Search message..."
          value={filters.q}
          onChange={(e) => onFilterChange({ ...filters, q: e.target.value })}
        />
      </div>

      {loading ? (
        <p className="muted">Loading logs...</p>
      ) : (
        <>
          <table className="log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Service</th>
                <th>Level</th>
                <th>Message</th>
                <th>Response (ms)</th>
                <th>Host</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    No logs match the current filters.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td>{log.serviceName}</td>
                  <td>
                    <span className={`level-badge ${LEVEL_CLASS[log.level]}`}>{log.level}</span>
                  </td>
                  <td>{log.message}</td>
                  <td>{Math.round(log.responseTimeMs)}</td>
                  <td>{log.hostname}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              type="button"
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
