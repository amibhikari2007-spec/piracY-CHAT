import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { MessageStatus } from '../../types';
import clsx from 'clsx';

interface MessageTicksProps {
  status: MessageStatus;
  pending?: boolean;
  failed?: boolean;
  className?: string;
}

const MessageTicks: React.FC<MessageTicksProps> = ({ status, pending, failed, className }) => {
  if (pending) {
    return <Clock size={12} className={clsx('text-wa-secondary', className)} />;
  }
  if (failed) {
    return (
      <span className={clsx('text-red-500 text-xs font-bold', className)}>!</span>
    );
  }

  switch (status) {
    case 'sent':
      return <Check size={14} className={clsx('text-wa-secondary', className)} />;
    case 'delivered':
      return <CheckCheck size={14} className={clsx('text-wa-secondary', className)} />;
    case 'seen':
      return <CheckCheck size={14} className={clsx('text-blue-500', className)} />;
    default:
      return null;
  }
};

export default MessageTicks;
