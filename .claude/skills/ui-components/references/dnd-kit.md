# @dnd-kit 拖放實作參考

## 安裝

```bash
npm install @dnd-kit/core @dnd-kit/utilities
```

## 基本結構

```tsx
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

function GameDndContext({ children, onDragEnd }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 需拖曳 8px 才啟動
      },
    })
  );

  const [activePiece, setActivePiece] = useState(null);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay>
        {activePiece && <Piece piece={activePiece} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
```

---

## 可拖曳元件（Piece）

```tsx
import { useDraggable } from '@dnd-kit/core';

function DraggablePiece({ piece, source, canDrag }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: piece.id,
    data: { piece, source },
    disabled: !canDrag,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-50' : ''}
    >
      <Piece piece={piece} />
    </div>
  );
}
```

---

## 可放置區域（Cell）

```tsx
import { useDroppable } from '@dnd-kit/core';

function DroppableCell({ row, col, children, canDrop }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col },
    disabled: !canDrop,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        w-24 h-24 border-2
        ${isOver && canDrop ? 'border-green-500 bg-green-100' : ''}
        ${isOver && !canDrop ? 'border-red-500 bg-red-100' : ''}
      `}
    >
      {children}
    </div>
  );
}
```

---

## 拖曳事件處理

```tsx
function handleDragStart(event) {
  const { active } = event;
  setActivePiece(active.data.current.piece);
}

function handleDragEnd(event) {
  const { active, over } = event;
  setActivePiece(null);

  if (!over) return;

  const piece = active.data.current.piece;
  const source = active.data.current.source;
  const { row, col } = over.data.current;

  // 執行移動
  onMove({
    piece,
    from: source,
    to: { row, col },
  });
}
```

---

## DragOverlay 避免 z-index 問題

```tsx
<DragOverlay dropAnimation={null}>
  {activePiece && (
    <Piece
      piece={activePiece}
      isDragging
      className="shadow-lg scale-110"
    />
  )}
</DragOverlay>
```

使用 `DragOverlay` 而非直接拖曳元件，確保拖曳中的棋子永遠在最上層。
