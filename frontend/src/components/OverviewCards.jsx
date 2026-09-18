export default function OverviewCards({ overview }) {
  if (!overview) return null;

  const cards = [
    { label: 'Total logs', value: overview.totalLogs },
    { label: 'Logs (last hour)', value: overview.logsLastHour },
    { label: 'Info', value: overview.levelCounts.INFO },
    { label: 'Warning', value: overview.levelCounts.WARNING },
    { label: 'Error', value: overview.levelCounts.ERROR },
    { label: 'Critical', value: overview.levelCounts.CRITICAL },
  ];

  return (
    <div className="cards-grid">
      {cards.map((card) => (
        <div className="stat-card" key={card.label}>
          <div className="stat-value">{card.value ?? 0}</div>
          <div className="stat-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
