import React from 'react';

interface AchievementIconProps {
  id: string;
  tier: number; // 1 = Bronze, 2 = Silver, 3 = Gold
  unlocked: boolean;
  className?: string;
  size?: number;
}

export const AchievementIcon: React.FC<AchievementIconProps> = ({
  id,
  tier,
  unlocked,
  className = '',
  size = 64
}) => {
  // Metallic filters based on tier
  const getFilterStyle = (): React.CSSProperties => {
    if (!unlocked) {
      return { filter: 'grayscale(1) opacity(0.25)' };
    }
    switch (tier) {
      case 1: // Bronze
        return { filter: 'sepia(0.6) hue-rotate(-15deg) saturate(1.8) contrast(1.1) brightness(0.9)' };
      case 2: // Silver
        return { filter: 'grayscale(1) brightness(1.2) contrast(1.1)' };
      case 3: // Gold
        return { filter: 'sepia(0.7) hue-rotate(15deg) saturate(2.5) contrast(1.2) brightness(1.1) drop-shadow(0 0 6px rgba(234, 179, 8, 0.5))' };
      default:
        return {};
    }
  };

  const style = getFilterStyle();

  // Custom inline SVGs for minimalistic creatures with big cute cartoon eyes and smiles
  const renderIconContent = () => {
    switch (id) {
      case 'streak_puffer':
        return (
          <img
            src="/achievements/puffer_cartoon.jpg"
            alt="Pufferfish Pride"
            style={{ width: size, height: size, objectFit: 'contain', ...style }}
            className={`transition-all duration-300 ${className}`}
          />
        );

      case 'translation_angler':
        return (
          <img
            src="/achievements/angler.jpg"
            alt="Deep Sea Translator"
            style={{ width: size, height: size, objectFit: 'contain', ...style }}
            className={`transition-all duration-300 ${className}`}
          />
        );

      case 'review_turtle':
        return (
          <img
            src="/achievements/turtle.jpg"
            alt="Coral Conservator"
            style={{ width: size, height: size, objectFit: 'contain', ...style }}
            className={`transition-all duration-300 ${className}`}
          />
        );

      case 'discussion_dolphin':
        // Dolphin
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" style={style} className={`transition-all duration-300 ${className}`}>
            <defs>
              <linearGradient id="dolphinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            {/* Body curved tail */}
            <path d="M 30,70 Q 20,60 15,45 Q 18,35 28,30 Q 55,25 75,45 Q 85,55 78,65 Q 70,68 62,60 Q 45,45 35,58 T 30,70" fill="url(#dolphinGrad)" />
            {/* Snout */}
            <path d="M 72,43 C 78,41 84,45 82,49 C 78,52 74,48 72,43" fill="#0ea5e9" />
            {/* Flippers */}
            <path d="M 50,45 Q 52,58 45,62 Q 42,52 50,45" fill="#2563eb" />
            <path d="M 54,30 Q 52,18 58,15 Q 60,25 54,30" fill="#0ea5e9" /> {/* Dorsal fin */}
            <path d="M 16,45 L 6,40 L 10,48 L 5,55 Z" fill="#2563eb" /> {/* Tail fin */}
            {/* Eyes */}
            <circle cx="66" cy="40" r="3.5" fill="white" />
            <circle cx="66" cy="40" r="1.7" fill="#1e293b" />
            {/* Smile */}
            <path d="M 70,47 Q 74,50 77,46" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );

      case 'reputation_stingray':
        return (
          <img
            src="/achievements/stingray.jpg"
            alt="Tidal Wave"
            style={{ width: size, height: size, objectFit: 'contain', ...style }}
            className={`transition-all duration-300 ${className}`}
          />
        );

      case 'goal_seahorse':
        return (
          <img
            src="/achievements/seahorse.jpg"
            alt="Goal Getter"
            style={{ width: size, height: size, objectFit: 'contain', ...style }}
            className={`transition-all duration-300 ${className}`}
          />
        );

      default:
        return (
          <div style={{ width: size, height: size }} className="bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
            ?
          </div>
        );
    }
  };

  return (
    <div className="relative inline-block transition-transform duration-300 hover:scale-110 hover:rotate-3 cursor-pointer">
      {renderIconContent()}
    </div>
  );
};
