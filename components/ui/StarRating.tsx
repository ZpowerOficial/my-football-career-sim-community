import React from "react";

interface StarRatingProps {
  /** Rating value (0-5, supports decimals) */
  rating: number;
  /** Maximum number of stars (default: 5) */
  maxStars?: number;
  /** Size of each star in pixels (default: 16) */
  size?: number;
  /** Color for filled stars (default: text-yellow-400) */
  filledColor?: string;
  /** Color for empty stars (default: text-slate-600) */
  emptyColor?: string;
  /** Additional className for the container */
  className?: string;
  /** Show numeric rating next to stars */
  showValue?: boolean;
}

/**
 * StarRating Component
 *
 * A visually consistent star rating display that properly handles:
 * - Full stars (100% filled)
 * - Half stars (50% filled with full outline)
 * - Empty stars (0% filled, outline only)
 * - Partial fills (any percentage)
 *
 * Uses CSS clip-path to overlay filled stars on outline stars,
 * ensuring consistent shape regardless of fill state.
 *
 * @example
 * <StarRating rating={3.5} />
 * <StarRating rating={4.2} size={20} showValue />
 * <StarRating rating={2} maxStars={5} filledColor="text-amber-400" />
 */
export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 16,
  filledColor = "text-yellow-400",
  emptyColor = "text-slate-600",
  className = "",
  showValue = false,
}) => {
  // Clamp rating between 0 and maxStars
  const clampedRating = Math.max(0, Math.min(rating, maxStars));

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${clampedRating.toFixed(1)} out of ${maxStars} stars`}
    >
      {Array.from({ length: maxStars }, (_, index) => {
        // Calculate fill percentage for this star (0-100)
        const fillPercentage = Math.max(
          0,
          Math.min(100, (clampedRating - index) * 100)
        );

        return (
          <Star
            key={index}
            size={size}
            fillPercentage={fillPercentage}
            filledColor={filledColor}
            emptyColor={emptyColor}
          />
        );
      })}
      {showValue && (
        <span
          className={`ml-1.5 text-xs font-semibold ${filledColor}`}
          style={{ fontSize: size * 0.75 }}
        >
          {clampedRating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

/**
 * Individual Star Component
 * Uses layered approach: outline star on bottom, filled star on top with clip-path
 */
const Star: React.FC<{
  size: number;
  fillPercentage: number;
  filledColor: string;
  emptyColor: string;
}> = ({ size, fillPercentage, filledColor, emptyColor }) => {
  // SVG path for a 5-pointed star
  const starPath =
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Base layer: Empty star (outline) - always visible */}
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={`absolute inset-0 ${emptyColor}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={starPath} />
      </svg>

      {/* Fill layer: Filled star with clip-path - only visible portion */}
      {fillPercentage > 0 && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            clipPath: `inset(0 ${100 - fillPercentage}% 0 0)`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={filledColor}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={1}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={starPath} />
          </svg>
        </div>
      )}
    </div>
  );
};

/**
 * ClubStars - Pre-configured star rating for club reputation
 * Shows club tier with consistent styling
 */
export const ClubStars: React.FC<{
  stars: number;
  className?: string;
  size?: number;
}> = ({ stars, className = "", size = 12 }) => (
  <StarRating
    rating={stars}
    maxStars={5}
    size={size}
    filledColor="text-yellow-400"
    emptyColor="text-slate-700"
    className={className}
  />
);

/**
 * WeakFootStars - Pre-configured for weak foot ratings (typically 1-5)
 */
export const WeakFootStars: React.FC<{
  value: number;
  className?: string;
}> = ({ value, className = "" }) => (
  <StarRating
    rating={value}
    maxStars={5}
    size={12}
    filledColor="text-yellow-400"
    emptyColor="text-slate-600"
    className={className}
  />
);

/**
 * SkillStars - Pre-configured for skill ratings (e.g., skill moves)
 */
export const SkillStars: React.FC<{
  value: number;
  max?: number;
  className?: string;
}> = ({ value, max = 5, className = "" }) => (
  <StarRating
    rating={value}
    maxStars={max}
    size={14}
    filledColor="text-purple-400"
    emptyColor="text-slate-700"
    className={className}
  />
);

/**
 * InfrastructureStars - Pre-configured for infrastructure ratings
 */
export const InfrastructureStars: React.FC<{
  value: number;
  className?: string;
}> = ({ value, className = "" }) => (
  <StarRating
    rating={value}
    maxStars={5}
    size={10}
    filledColor="text-yellow-400"
    emptyColor="text-slate-700"
    className={className}
  />
);

export default StarRating;
