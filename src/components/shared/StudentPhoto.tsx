import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveStudentProfilePhotoUrlAsync } from '@/lib/utils/profilePhoto';
import { cn } from '@/lib/utils';

interface StudentPhotoProps {
  src?: string | null;
  name?: string;
  className?: string;
  imageClassName?: string;
  /** Prioridad de carga: baja en listados largos */
  priority?: 'low' | 'auto';
}

export const StudentPhoto = ({
  src,
  name = '',
  className,
  imageClassName,
  priority = 'low',
}: StudentPhotoProps) => {
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(src?.trim()));

  useEffect(() => {
    if (!src?.trim()) {
      setPhotoSrc(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void resolveStudentProfilePhotoUrlAsync(src).then((url) => {
      if (cancelled) return;
      setPhotoSrc(url);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <Avatar className={cn('rounded-2xl', className)}>
      {photoSrc && !loading ? (
        <AvatarImage
          src={photoSrc}
          alt={name}
          loading={priority === 'low' ? 'lazy' : 'eager'}
          decoding="async"
          fetchPriority={priority === 'low' ? 'low' : 'auto'}
          className={cn('object-cover', imageClassName)}
          onError={() => setPhotoSrc(null)}
        />
      ) : null}
      <AvatarFallback className="rounded-2xl bg-muted/60 text-muted-foreground">
        {initials ? (
          <span className="text-sm font-semibold">{initials}</span>
        ) : (
          <User className="h-8 w-8" />
        )}
      </AvatarFallback>
    </Avatar>
  );
};
