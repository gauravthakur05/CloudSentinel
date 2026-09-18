import { useCallback, useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import OverviewCards from '../components/OverviewCards';
import ServiceChart from '../components/ServiceChart';
import LogTable from '../components/LogTable';

const POLL_INTERVAL_MS = 5000;

export default function Dashboard() {
  const { user, logout } = useAuth();

  const [overview, setOverview] = useState(null);
  const [services, setServices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ service: '', level: '', q: '' });
  const [loading, setLoading] = useState(true);
  const [genCount, setGenCount] = useState(20);

  const fetchOverview = useCallback(async () => {
    const res = await client.get('/api/analytics/overview');
    setOverview(res.data);
  }, []);

  const fetchServices = useCallback(async () => {
    const res = await client.get('/api/analytics/services');
    setServices(res.data.data);
  }, []);

  const fetchLogs = useCallback(async (page = 1, currentFilters = filters) => {
    setLoading(true);
    const params = { page, limit: pagination.limit };
    if (currentFilters.service) params.service = currentFilters.service;
    if (currentFilters.level) params.level = currentFilters.level;
    if (currentFilters.q) params.q = currentFilters.q;

    const res = await client.get('/api/logs', { params });
    setLogs(res.data.data);
    setPagination(res.data.pagination);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.limit]);

  // Initial load
  useEffect(() => {
    fetchOverview();
    fetchServices();
    fetchLogs(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the overview + service chart periodically so the dashboard feels live.
  useEffect(() => {
    const timer = setInterval(() => {
      fetchOverview();
      fetchServices();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchOverview, fetchServices]);

  // Re-fetch logs whenever filters change (debounced lightly via effect).
  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(1, filters), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleGenerate = async () => {
    await client.post('/api/logs/generate', { count: genCount });
    fetchOverview();
    fetchServices();
    fetchLogs(pagination.page, filters);
  };

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <h1>CloudSentinel</h1>
          <span className="muted">Logged in as {user?.email} ({user?.role})</span>
        </div>
        <div className="topbar-actions">
          <input
            type="number"
            min={1}
            max={500}
            value={genCount}
            onChange={(e) => setGenCount(Number(e.target.value))}
            style={{ width: 70 }}
          />
          <button type="button" onClick={handleGenerate}>
            Generate logs
          </button>
          <button type="button" onClick={logout} className="secondary">
            Log out
          </button>
        </div>
      </header>

      <OverviewCards overview={overview} />
      <ServiceChart data={services} />
      <LogTable
        logs={logs}
        filters={filters}
        onFilterChange={setFilters}
        pagination={pagination}
        onPageChange={(page) => fetchLogs(page, filters)}
        loading={loading}
      />
    </div>
  );
}
