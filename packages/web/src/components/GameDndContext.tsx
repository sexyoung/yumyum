import { ReactNode, useCallback, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import Piece, { DragData } from './Piece';

interface GameDndContextProps {
  children: ReactNode;
  onDrop: (row: number, col: number, data: DragData) => void;
}

/**
 * 遊戲拖曳上下文
 * 包裝 dnd-kit 的 DndContext，處理拖曳結束事件
 */
export default function GameDndContext({ children, onDrop }: GameDndContextProps) {
  // 追蹤當前正在拖曳的棋子資料
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);

  // 使用 PointerSensor，同時支援觸控和滑鼠
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      // 需要移動 3px 才開始拖曳，避免誤觸
      distance: 3,
    },
  });

  const sensors = useSensors(pointerSensor);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const dragData = event.active.data.current as DragData | undefined;
    setActiveDragData(dragData || null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragData(null);
    const { active, over } = event;

    if (!over) return;

    // 從 droppable 的 data 取得 row, col
    const dropData = over.data.current as { row: number; col: number } | undefined;
    if (!dropData) return;

    // 從 draggable 的 data 取得拖曳資料
    const dragData = active.data.current as DragData | undefined;
    if (!dragData) return;

    onDrop(dropData.row, dropData.col, dragData);
  }, [onDrop]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay dropAnimation={null}>
        {activeDragData && (
          <div style={{ willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}>
            <Piece
              size={activeDragData.size}
              color={activeDragData.color}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
