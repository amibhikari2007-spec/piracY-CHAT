import React from 'react';
import clsx from 'clsx';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showStatus?: boolean;
  className?: string;
}

const sizeMap = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const dotMap = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
};

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const getColor = (name: string) => {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-rose-500',   'bg-cyan-500',  'bg-fuchsia-500', 'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  isOnline = false,
  showStatus = false,
  className,
}) => {
  return (
    <div className={clsx('relative flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={clsx('rounded-full object-cover', sizeMap[size])}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full flex items-center justify-center font-semibold text-white select-none',
            sizeMap[size],
            getColor(name)
          )}
        >
          {getInitials(name)}
        </div>
      )}

      {showStatus && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-white dark:border-wa-panel-dark',
            dotMap[size],
            isOnline ? 'bg-wa-green' : 'bg-wa-secondary dark:bg-wa-secondary-dark'
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
