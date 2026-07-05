const LoadingSpinner = ({ fullscreen = false, size = 'md', text = '' }) => {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizes[size]} border-4 border-dark-400 border-t-primary-500 rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {text && <p className="text-gray-400 text-sm">{text}</p>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-dark-900 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
