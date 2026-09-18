import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function ServiceChart({ data }) {
  const chartData = (data || []).map((row) => ({
    service: row._id,
    logs: row.logCount,
    errors: row.errorCount,
  }));

  return (
    <div className="panel">
      <h2>Logs by service</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="service" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="logs" fill="#3878c9" name="Total logs" />
          <Bar dataKey="errors" fill="#d64545" name="Errors" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
