import React from 'react';

interface TypingIndicatorProps {
  username?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ username }) => (
  <div className="flex items-end gap-2 px-3 py-1">
    <div className="bg-white dark:bg-wa-bubble-dark rounded-2xl rounded-bl-sm px-4 py-3 shadow-msg flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-wa-secondary dark:bg-wa-secondary-dark animate-bounce-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
    {username && (
      <span className="text-xs text-wa-secondary dark:text-wa-secondary-dark mb-1">
        {username} is typing…
      </span>
    )}
  </div>
);

export default TypingIndicator;
