import { useState } from 'react';

interface RandomizeButtonProps {
  onRandomize: () => Promise<unknown>;
  disabled?: boolean;
}

function RandomizeButton({ onRandomize, disabled }: RandomizeButtonProps) {
  const [isRandomizing, setIsRandomizing] = useState(false);

  const handleClick = async () => {
    if (disabled || isRandomizing) return;

    setIsRandomizing(true);
    try {
      await onRandomize();
    } finally {
      setIsRandomizing(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isRandomizing}
      className={`
        w-full py-3 px-4 rounded-lg font-semibold text-white
        transition-all duration-200 flex items-center justify-center gap-2
        ${disabled || isRandomizing
          ? 'bg-gray-300 cursor-not-allowed'
          : 'bg-zoom-blue hover:bg-zoom-dark active:scale-98 shadow-md hover:shadow-lg'
        }
      `}
    >
      {isRandomizing ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Randomizing...</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Randomize Order</span>
        </>
      )}
    </button>
  );
}

export default RandomizeButton;
