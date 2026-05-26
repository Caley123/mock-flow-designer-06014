import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageHeaderAccent =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  accent?: PageHeaderAccent;
  children?: ReactNode;
  className?: string;
}

const accentStyles: Record<
  PageHeaderAccent,
  { border: string; icon: string; eyebrow: string }
> = {
  primary: {
    border: 'border-l-primary',
    icon: 'bg-primary/12 text-primary',
    eyebrow: 'text-primary',
  },
  secondary: {
    border: 'border-l-secondary',
    icon: 'bg-secondary/12 text-secondary',
    eyebrow: 'text-secondary',
  },
  success: {
    border: 'border-l-success',
    icon: 'bg-success/12 text-success',
    eyebrow: 'text-success',
  },
  warning: {
    border: 'border-l-warning',
    icon: 'bg-warning/12 text-warning',
    eyebrow: 'text-warning',
  },
  info: {
    border: 'border-l-info',
    icon: 'bg-info/12 text-info',
    eyebrow: 'text-info',
  },
  accent: {
    border: 'border-l-accent',
    icon: 'bg-accent/12 text-accent',
    eyebrow: 'text-accent',
  },
};

export const PageHeader = ({
  title,
  description,
  eyebrow,
  icon: Icon,
  accent = 'primary',
  children,
  className,
}: PageHeaderProps) => {
  const styles = accentStyles[accent];

  return (
    <header
      className={cn(
        'rounded-[28px] border border-border bg-card',
        'border-l-[3px]',
        styles.border,
        className
      )}
    >
      <div className="px-5 py-5 md:px-7 md:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {Icon && (
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  styles.icon
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
            )}
            <div className="min-w-0 space-y-1">
              {eyebrow && (
                <p
                  className={cn(
                    'font-mono text-[11px] font-medium uppercase tracking-[0.08em]',
                    styles.eyebrow
                  )}
                >
                  {eyebrow}
                </p>
              )}
              <h1 className="text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-[28px] md:leading-[1.14]">
                {title}
              </h1>
              {description && (
                <p className="max-w-2xl pt-0.5 text-[15px] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          {children && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-4 sm:border-t-0 sm:pt-1">
              {children}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
