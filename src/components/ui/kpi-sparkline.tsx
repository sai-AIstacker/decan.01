// Pure SVG sparkline — no Recharts dependency.
// This keeps the entire Recharts bundle out of the initial page load.

interface KPISparklineProps {
  data: number[];
  stroke: string;
  grad: string;
  title: string;
  color: string;
}

export function KPISparkline({ data, stroke, grad, title, color }: KPISparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 36;
  const pad = 1;

  // Build polyline points
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  // Area: close the path along the bottom
  const areaPath = `M${points[0]} ${points.slice(1).map(p => `L${p}`).join(" ")} L${w - pad},${h} L${pad},${h} Z`;
  const gradId = `spark-${color}-${title.replace(/\s/g, "")}`;

  return (
    <div className="h-9 -mx-1 -mb-1">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={grad} stopOpacity={0.18} />
            <stop offset="95%" stopColor={grad} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <polyline
          points={polyline}
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
