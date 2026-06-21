import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  getSignedProfilePhotoUrl,
  resolveStudentProfilePhotoUrl,
} from '@/lib/utils/profilePhoto';
import { cn } from '@/lib/utils';

interface StudentPhotoProps {
  src?: string | null;
  name?: string;
  className?: string;
  imageClassName?: string;
}

export const StudentPhoto = ({
  src,
  name = '',
  className,
  imageClassName,
}: StudentPhotoProps) => {
  const [photoSrc, setPhotoSrc] = useState<string | null>(() =>
    resolveStudentProfilePhotoUrl(src)
  );
  const [triedSigned, setTriedSigned] = useState(false);

  useEffect(() => {
    setPhotoSrc(resolveStudentProfilePhotoUrl(src));
    setTriedSigned(false);
  }, [src]);

  const handleError = async () => {
    if (triedSigned || !src?.trim()) {
      setPhotoSrc(null);
      return;
    }
    setTriedSigned(true);
    const signed = await getSignedProfilePhotoUrl(src);
    setPhotoSrc(signed);
  };

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <Avatar className={cn('rounded-2xl', className)}>
      {photoSrc ? (
        <AvatarImage
          src={photoSrc}
          alt={name}
          loading="lazy"
          decoding="async"
          className={cn('object-cover', imageClassName)}
          onError={() => {
            void handleError();
          }}
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
