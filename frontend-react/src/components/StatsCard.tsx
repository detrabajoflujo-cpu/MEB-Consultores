import React from 'react';

interface StatsCardProps {
  icon: string;
  value: number | string;
  label: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  change?: string;
}

const colorMap = {
  blue:   { var: 'var(--blue)',   bg: 'var(--blue-dim)',   stat: 'var(--blue)' },
  green:  { var: 'var(--green)',  bg: 'var(--green-dim)',  stat: 'var(--green)' },
  yellow: { var: 'var(--yellow)', bg: 'var(--yellow-dim)', stat: 'var(--yellow)' },
  red:    { var: 'var(--red)',    bg: 'var(--red-dim)',    stat: 'var(--red)' },
  purple: { var: 'var(--purple)', bg: 'var(--purple-dim)', stat: 'var(--purple)' },
};

const StatsCard: React.FC<StatsCardProps> = ({ icon, value, label, color, change }) => {
  const c = colorMap[color];

  return (
    <div
      className="stat-card"
      style={{ ['--stat-color' as string]: c.var, ['--stat-bg' as string]: c.bg } as React.CSSProperties}
    >
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {change && (
        <div className="stat-change">
          <span>↑</span>
          <span>{change}</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
