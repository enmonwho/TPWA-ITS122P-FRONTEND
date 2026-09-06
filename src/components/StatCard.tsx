import type { ReactNode } from 'react';
import { useRef, useEffect } from 'react';
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
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textEl = textRef.current;
    const containerEl = containerRef.current;
    if (!textEl || !containerEl || !value) return;

    const resize = () => {
      textEl.style.fontSize = '54px';
      let currentSize = 54;
      const minSize = 16;

      // Step down the font size until it fits in the container
      while (textEl.scrollWidth > containerEl.clientWidth && currentSize > minSize) {
        currentSize -= 1;
        textEl.style.fontSize = `${currentSize}px`;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [value]);

  return (
    <div className="dash-stat-card">
      <div className="dash-stat-card-bg" style={{ background: `var(${gradient})` }}>
        {icon}
      </div>
      <div className="dash-stat-card-content">
        <div
          ref={containerRef}
          className={
            value ? 'dash-stat-card-value-container' : 'dash-stat-card-title-container'
          }
        >
          {value ? (
            <div ref={textRef} className="dash-stat-card-value">
              {value}
            </div>
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
