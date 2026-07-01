interface ConfidenceRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
}

export function ConfidenceRing({
  value,
  size = 36,
  strokeWidth = 3,
}: ConfidenceRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const colorClass =
    value < 60 ? "#ef4444" : value < 80 ? "#f97316" : value < 95 ? "#10b981" : "#06b6d4";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(15, 23, 42, 0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorClass}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span
        className="absolute text-[9px] font-mono font-bold"
        style={{ color: colorClass }}
      >
        {value}
      </span>
    </div>
  );
}
