import { Cell as CellType } from '@yumyum/types';
import Piece from './Piece';

interface CellProps {
  cell: CellType;
  row: number;
  col: number;
  onClick?: () => void;
  selected?: boolean; // 格子上的棋子是否被選中
}

/**
 * Cell 組件 - 棋盤上的一個格子
 * 可以堆疊多個棋子，顯示最上層的棋子
 * 功能優先：簡單邊框區分格子，最小 44x44px（手機友善）
 */
export default function Cell({ cell, row, col, onClick, selected = false }: CellProps) {
  // 取得最上層的棋子（如果有）
  const topPiece = cell.pieces.length > 0 ? cell.pieces[cell.pieces.length - 1] : null;

  return (
    <div
      className={`
        w-full aspect-square md:w-24 md:h-24
        border-2 border-gray-400
        ${selected ? 'bg-yellow-100' : 'bg-gray-100'}
        flex items-center justify-center
        cursor-pointer
        hover:bg-gray-200
        transition-colors
        relative
      `}
      onClick={onClick}
      data-testid={`cell-${row}-${col}`}
    >
      {topPiece && (
        <Piece
          size={topPiece.size}
          color={topPiece.color}
          selected={selected}
        />
      )}

      {/* 顯示堆疊數量（如果有多個棋子） */}
      {cell.pieces.length > 1 && (
        <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
          {cell.pieces.length}
        </div>
      )}
    </div>
  );
}
