import { Cell as CellType } from '@yumyum/types';
import Cell from './Cell';

interface BoardProps {
  board: CellType[][];
  onCellClick?: (row: number, col: number) => void;
}

/**
 * Board 組件 - 3x3 棋盤
 * 功能優先：簡單的 grid 佈局，格子用邊框區分
 */
export default function Board({ board, onCellClick }: BoardProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full md:w-auto px-2 md:px-4 py-1 md:py-4">
      <div className="grid grid-cols-3 gap-0 bg-gray-400 w-full md:w-auto max-w-sm md:max-w-none">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Cell
              key={`${rowIndex}-${colIndex}`}
              cell={cell}
              row={rowIndex}
              col={colIndex}
              onClick={() => onCellClick?.(rowIndex, colIndex)}
            />
          ))
        )}
      </div>
    </div>
  );
}
