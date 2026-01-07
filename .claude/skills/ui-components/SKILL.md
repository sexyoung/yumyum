---
name: ui-components
description: YumYum UI 元件規範與模式。當建立或修改 React 元件、使用 Tailwind 樣式、或實作拖放功能時使用此 skill。
---

## 技術棧

- **React 18** + TypeScript
- **Tailwind CSS** - 樣式框架
- **@dnd-kit** - 拖放功能
- **Lucide React** - 圖示庫

## 元件目錄

```
packages/web/src/components/
├── Board.tsx           # 3x3 棋盤
├── Cell.tsx            # 單一格子
├── Piece.tsx           # 棋子（大/中/小，紅/藍）
├── PlayerReserve.tsx   # 玩家儲備區
└── GameDndContext.tsx  # 拖放上下文
```

## 棋子尺寸

```tsx
const sizeClasses = {
  small: 'w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12',
  medium: 'w-14 h-14 sm:w-15 sm:h-15 md:w-16 md:h-16',
  large: 'w-18 h-18 sm:w-20 sm:h-20 md:w-24 md:h-24',
};

const colorClasses = {
  red: 'bg-red-500 border-red-700',
  blue: 'bg-blue-500 border-blue-700',
};
```

## Cell 格子

```tsx
className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32
           border-2 border-gray-300
           flex items-center justify-center"
```

## 詳細參考

- **@dnd-kit 拖放**: [references/dnd-kit.md](references/dnd-kit.md)
- **動畫定義**: [references/animations.md](references/animations.md)

## 常用樣式

```tsx
// 按鈕
"px-6 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700
 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"

// 卡片
"bg-white rounded-xl shadow-lg p-6"

// 回合指示
isMyTurn ? "text-green-600" : "text-gray-500"
```

## 圖示

```tsx
import { Home, RotateCcw, ArrowLeft } from 'lucide-react';
<Home className="w-5 h-5" />
```
