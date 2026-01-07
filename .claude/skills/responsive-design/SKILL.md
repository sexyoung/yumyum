---
name: responsive-design
description: YumYum 響應式設計規範。當處理 RWD 佈局、Tailwind 斷點或手機/桌機適配時使用此 skill。
---

## Tailwind 斷點

| 前綴 | 最小寬度 | 裝置 |
|------|----------|------|
| (預設) | < 640px | 手機 |
| sm: | ≥ 640px | 大手機 |
| md: | ≥ 768px | 平板/小桌機 |
| lg: | ≥ 1024px | 桌機 |
| xl: | ≥ 1280px | 大桌機 |

## 遊戲佈局

```
手機 (< 768px)：垂直排列
┌──────────────────┐
│ 對手儲備（水平） │
├──────────────────┤
│      棋盤        │
├──────────────────┤
│ 我的儲備（水平） │
└──────────────────┘

桌機 (≥ 768px)：水平排列
┌──────┬──────────┬──────┐
│ 對手 │   棋盤   │ 我的 │
│(垂直)│          │(垂直)│
└──────┴──────────┴──────┘
```

## 響應式佈局範例

```tsx
// 主容器：手機垂直，桌機水平
<div className="flex flex-col md:flex-row md:items-center md:justify-center">
  <div className="md:order-1">
    <PlayerReserve ... />
  </div>
  <div className="md:order-2 md:mx-8">
    <Board ... />
  </div>
  <div className="md:order-3">
    <PlayerReserve ... />
  </div>
</div>
```

## 元件尺寸遞進

```tsx
// Cell 格子
w-24 h-24       // 手機 96px
sm:w-28 sm:h-28 // 大手機 112px
md:w-32 md:h-32 // 平板 128px
lg:w-36 lg:h-36 // 桌機 144px

// Piece 大棋子
w-18 h-18       // 手機 72px
sm:w-20 sm:h-20 // 大手機 80px
md:w-24 md:h-24 // 平板 96px
lg:w-28 lg:h-28 // 桌機 112px
```

## 文字響應式

```tsx
// 標題
text-4xl sm:text-5xl md:text-6xl

// 按鈕
text-lg sm:text-xl md:text-2xl
px-6 py-3 sm:px-8 sm:py-4

// 一般文字
text-sm sm:text-base md:text-lg
```

## 間距響應式

```tsx
// 元件間距
gap-3 sm:gap-4 md:gap-5 lg:gap-6

// 內距
p-4 sm:p-6 md:p-8

// 外距
m-2 sm:m-4 md:m-6
```

## 佈局方向切換

```tsx
// 手機水平、桌機垂直
flex flex-row md:flex-col

// 手機垂直、桌機水平
flex flex-col md:flex-row
```

## 隱藏/顯示

```tsx
// 只在手機顯示
block md:hidden

// 只在桌機顯示
hidden md:block
```
