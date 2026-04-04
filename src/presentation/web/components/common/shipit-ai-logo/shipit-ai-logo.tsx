import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface ShipitAiLogoProps {
  className?: string;
  size?: number;
  variant?: 'default' | 'dev';
}

export function ShipitAiLogo({ className, size = 24, variant = 'default' }: ShipitAiLogoProps) {
  return (
    <Image
      src="/shipit-brain.png"
      alt="ShipIT AI"
      width={size}
      height={Math.round(size * 0.61)}
      className={cn(
        'shrink-0 object-contain dark:brightness-125',
        variant === 'dev' && 'opacity-80',
        className
      )}
      style={{ width: size, height: 'auto' }}
      aria-hidden
    />
  );
}
