import { useState, useRef, useEffect } from 'react';
import { Cell as CellType, PieceColor } from '@yumyum/types';
import Piece, { DragData } from './Piece';

interface CellProps {
  cell: CellType;
  row: number;
  col: number;
  onClick?: () => void;
  selected?: boolean; // 格子上的棋子是否被選中
  onDrop?: (data: DragData) => void;
  canDrag?: boolean; // 是否允許拖曳此格上的棋子
  currentPlayer?: PieceColor; // 當前玩家，用於判斷是否可拖曳
  touchDragData?: DragData | null; // 當前觸控拖曳的資料
  onTouchDragStart?: (data: DragData) => void; // 觸控拖曳開始
  onTouchDrop?: (row: number, col: number) => void; // 觸控放置
}

/**
 * Cell 組件 - 棋盤上的一個格子
 * 可以堆疊多個棋子，顯示最上層的棋子
 * 功能優先：簡單邊框區分格子，最小 44x44px（手機友善）
 * 支援拖曳放置功能（桌面版用 drag API，手機版用 touch 事件）
 */
export default function Cell({ cell, row, col, onClick, selected = false, onDrop, canDrag = false, currentPlayer, touchDragData, onTouchDragStart, onTouchDrop }: CellProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  // 取得最上層的棋子（如果有）
  const topPiece = cell.pieces.length > 0 ? cell.pieces[cell.pieces.length - 1] : null;

  // 判斷這個格子上的棋子是否可以拖曳（必須是當前玩家的棋子）
  const pieceCanDrag = !!(canDrag && topPiece && topPiece.color === currentPlayer);

  // 是否正在觸控拖曳中
  const isTouchDragging = !!touchDragData;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const data: DragData = JSON.parse(e.dataTransfer.getData('application/json'));
      onDrop?.(data);
    } catch {
      // 忽略無效的拖曳資料
    }
  };

  // 監聽全域 touchend 事件來偵測放置
  useEffect(() => {
    if (!isTouchDragging || !cellRef.current) return;

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const cellRect = cellRef.current?.getBoundingClientRect();

      if (cellRect) {
        // 檢查觸控結束位置是否在此格子內
        if (
          touch.clientX >= cellRect.left &&
          touch.clientX <= cellRect.right &&
          touch.clientY >= cellRect.top &&
          touch.clientY <= cellRect.bottom
        ) {
          onTouchDrop?.(row, col);
        }
      }
    };

    document.addEventListener('touchend', handleGlobalTouchEnd);
    return () => document.removeEventListener('touchend', handleGlobalTouchEnd);
  }, [isTouchDragging, row, col, onTouchDrop]);

  // 監聯 touchmove 來顯示高亮
  useEffect(() => {
    if (!isTouchDragging || !cellRef.current) return;

    const handleGlobalTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const cellRect = cellRef.current?.getBoundingClientRect();

      if (cellRect) {
        const isOver =
          touch.clientX >= cellRect.left &&
          touch.clientX <= cellRect.right &&
          touch.clientY >= cellRect.top &&
          touch.clientY <= cellRect.bottom;
        setIsDragOver(isOver);
      }
    };

    document.addEventListener('touchmove', handleGlobalTouchMove);
    return () => document.removeEventListener('touchmove', handleGlobalTouchMove);
  }, [isTouchDragging]);

  // 清除高亮當拖曳結束
  useEffect(() => {
    if (!isTouchDragging) {
      setIsDragOver(false);
    }
  }, [isTouchDragging]);

  return (
    <div
      ref={cellRef}
      className={`
        w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32
        border-2 border-gray-400
        ${isDragOver ? 'bg-green-100 border-green-400' : selected ? 'bg-yellow-100' : 'bg-gray-100'}
        flex items-center justify-center
        cursor-pointer
        hover:bg-gray-200
        transition-colors
        relative
      `}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`cell-${row}-${col}`}
    >
      {topPiece && (
        <Piece
          size={topPiece.size}
          color={topPiece.color}
          selected={selected}
          draggable={pieceCanDrag}
          dragData={pieceCanDrag ? {
            type: 'board',
            color: topPiece.color,
            size: topPiece.size,
            fromRow: row,
            fromCol: col,
          } : undefined}
          onTouchDragStart={onTouchDragStart}
        />
      )}
    </div>
  );
}
