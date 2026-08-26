import appIcon from '@/assets/app-icon.png';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-10 w-10 rounded-xl',
};

export function AppLogo({ className, size = 'sm' }) {
  return (
    <img
      src={appIcon}
      alt="Orbdyn"
      className={cn('shrink-0 object-cover', SIZE_CLASS[size] || SIZE_CLASS.sm, className)}
    />
  );
}
