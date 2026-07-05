const Avatar = ({ username = '', avatar = '', size = 'md', className = '' }) => {
  const sizes = {
    xs:  'h-6 w-6 text-xs',
    sm:  'h-8 w-8 text-sm',
    md:  'h-10 w-10 text-base',
    lg:  'h-12 w-12 text-lg',
    xl:  'h-16 w-16 text-xl',
  };

  const initial = username?.charAt(0).toUpperCase() || '?';

  // Simple color from username
  const colors = ['bg-purple-600', 'bg-blue-600', 'bg-green-600', 'bg-yellow-600', 'bg-red-600', 'bg-pink-600'];
  const colorIndex = username.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex] || 'bg-gray-600';

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username}
        className={`${sizes[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} ${bgColor} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ${className}`}
      aria-label={username}
    >
      {initial}
    </div>
  );
};

export default Avatar;
