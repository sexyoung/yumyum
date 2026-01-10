interface LogoProps {
  className?: string;
  size?: number;
}

function Logo({ className = '', size = 120 }: LogoProps) {
  // 計算比例
  const width = size;
  const height = size * 0.5;

  return (
    <svg
      viewBox="0 0 120 60"
      width={width}
      height={height}
      className={className}
      aria-label="YumYum Logo"
    >
      {/* 水平線穿過三個圓 */}
      <line
        x1="3"
        y1="30"
        x2="117"
        y2="30"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* 小圓 - 左邊 */}
      <circle
        cx="23"
        cy="30"
        r="10"
        fill="none"
        stroke="white"
        strokeWidth="5"
      />

      {/* 中圓 - 中間 */}
      <circle
        cx="54"
        cy="30"
        r="13"
        fill="none"
        stroke="white"
        strokeWidth="5"
      />

      {/* 大圓 - 右邊 */}
      <circle
        cx="91"
        cy="30"
        r="16"
        fill="none"
        stroke="white"
        strokeWidth="5"
      />
    </svg>
  );
}

export default Logo;
