# 動畫定義參考

## CSS Keyframes（index.css）

### 獲勝動畫

```css
@keyframes winning-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

/* 使用 */
.winning-cell {
  animation: winning-pulse 0.6s ease-in-out infinite;
}
```

### Emoji 浮動動畫

```css
@keyframes emoji-float {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(20px);
  }
  15% {
    opacity: 1;
    transform: scale(1.2) translateY(0);
  }
  85% {
    opacity: 1;
    transform: scale(1) translateY(-10px);
  }
  100% {
    opacity: 0;
    transform: scale(0.8) translateY(-30px);
  }
}

/* 使用 */
.emoji-popup {
  animation: emoji-float 2s ease-out forwards;
}
```

---

## React 動畫實作

### 獲勝格子動畫（延遲）

```tsx
function Cell({ isWinning, winningIndex }) {
  const style = isWinning
    ? {
        animation: 'winning-pulse 0.6s ease-in-out infinite',
        animationDelay: `${winningIndex * 150}ms`,
        backgroundColor: 'rgba(255, 215, 0, 0.3)',
      }
    : undefined;

  return <div style={style}>{/* ... */}</div>;
}
```

### Emoji 動畫（自動重啟）

```tsx
function EmojiPopup({ emoji, onComplete }) {
  const [key, setKey] = useState(Date.now());

  useEffect(() => {
    // 強制重新掛載以重啟動畫
    setKey(Date.now());

    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [emoji]);

  return (
    <div
      key={key}
      className="text-6xl"
      style={{ animation: 'emoji-float 2s ease-out forwards' }}
    >
      {emoji}
    </div>
  );
}
```

### 隨機位置 Emoji

```tsx
const [emoji, setEmoji] = useState<{
  emoji: string;
  key: number;
  x: number;
} | null>(null);

function showEmoji(emojiChar: string) {
  setEmoji({
    emoji: emojiChar,
    key: Date.now(),
    x: 20 + Math.random() * 60, // 20% ~ 80%
  });
}

// 渲染
{emoji && (
  <div
    key={emoji.key}
    className="fixed text-6xl"
    style={{
      left: `${emoji.x}%`,
      top: '15%',
      animation: 'emoji-float 2s ease-out forwards',
    }}
  >
    {emoji.emoji}
  </div>
)}
```

---

## Tailwind 過渡效果

```tsx
// 按鈕 hover
"transition-colors duration-200 hover:bg-blue-700"

// 透明度變化
"transition-opacity duration-300"

// 縮放效果
"transition-transform duration-200 hover:scale-105"

// 組合效果
"transition-all duration-300 ease-in-out"
```

---

## 動畫最佳實踐

1. **使用 transform/opacity**: 效能最好，不觸發 reflow
2. **避免 width/height 動畫**: 會觸發 layout，效能差
3. **使用 will-change**: 提示瀏覽器優化
4. **控制動畫時長**: 0.2s-0.5s 最自然
