import React, { useState } from 'react';
import { COOL_AVATARS } from '../utils/avatars';

interface AvatarImgProps {
  avatar?: string;
  className?: string;
  alt?: string;
}

export const AvatarImg: React.FC<AvatarImgProps> = ({
  avatar,
  className = 'w-full h-full',
  alt = 'Avatar'
}) => {
  const [loadError, setLoadError] = useState(false);

  if (!avatar) {
    return <span className="text-xl select-none">🎮</span>;
  }

  // If it's a URL or data URI
  const isUrl = avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:');

  // If it matches one of our cool avatar IDs
  const matched = !isUrl ? COOL_AVATARS.find(a => a.id === avatar) : null;
  const src = isUrl ? avatar : (matched ? matched.url : null);

  if (src && !loadError) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${className} object-cover rounded-xl pointer-events-none select-none`}
        onError={() => setLoadError(true)}
        loading="lazy"
      />
    );
  }

  // Fallback for legacy emoji or failed load
  return (
    <span className="text-xl sm:text-2xl leading-none select-none filter drop-shadow">
      {avatar.length <= 4 ? avatar : '🎮'}
    </span>
  );
};
