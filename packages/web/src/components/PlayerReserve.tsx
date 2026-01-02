import { PieceColor, PieceSize } from '@yumyum/types';
import Piece from './Piece';

interface PlayerReserveProps {
  color: PieceColor;
  reserves: {
    small: number;
    medium: number;
    large: number;
  };
  onPieceClick?: (size: PieceSize) => void;
}

/**
 * PlayerReserve 組件 - 玩家的棋子儲備區
 * 顯示剩餘棋子數量（數字直接顯示在棋子內）
 * 手機版：水平排列節省空間
 * 桌機版：垂直排列更清楚
 */
export default function PlayerReserve({ color, reserves, onPieceClick }: PlayerReserveProps) {
  const sizes: PieceSize[] = ['small', 'medium', 'large'];

  return (
    <div className="flex flex-row md:flex-col gap-3 md:gap-4">
      {sizes.map((size) => (
        <button
          key={size}
          onClick={() => onPieceClick?.(size)}
          disabled={reserves[size] === 0}
          className="disabled:opacity-30 disabled:cursor-not-allowed"
          data-testid={`reserve-${color}-${size}`}
        >
          {/* 棋子，數量直接顯示在圓圈內 */}
          <Piece size={size} color={color} label={reserves[size]} />
        </button>
      ))}
    </div>
  );
}
