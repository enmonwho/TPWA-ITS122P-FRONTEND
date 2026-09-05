import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface StatCardProps {
  gradient: string;
  icon: ReactNode;
  title?: ReactNode;
  value?: ReactNode;
  subtitle: string;
  showChevron?: boolean;
  iconButton?: string;
}

export default function StatCard({
  gradient,
  icon,
  title,
  value,
  subtitle,
  showChevron = false,
  iconButton,
}: StatCardProps) {
  return (
    <div className="dash-stat-card">
      <div className="dash-stat-card-bg" style={{ background: `var(${gradient})` }}>
        {icon}
      </div>
      <div className="dash-stat-card-content">
        <div
          className={
            value ? 'dash-stat-card-value-container' : 'dash-stat-card-title-container'
          }
        >
          {value ? (
            <div className="dash-stat-card-value">{value}</div>
          ) : (
            <div className="dash-stat-card-title">{title}</div>
          )}
        </div>
        <div className="dash-stat-card-footer">
          <div className="dash-stat-card-subtitle">{subtitle}</div>
          {iconButton ? (
            <div className="dash-stat-card-chevron-svg">
              <img src={iconButton} alt="Action" />
            </div>
          ) : (
            showChevron && (
              <div className="dash-stat-card-chevron">
                <ChevronRight size={19} color="#000" />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
