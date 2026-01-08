/**
 * 遊戲音效模組
 * 使用 Web Audio API 生成合成音效
 */

// 音效類型
type SoundType = 'place' | 'capture' | 'win' | 'lose';

// AudioContext singleton
let audioContext: AudioContext | null = null;

// 音效開關狀態
let soundEnabled = typeof localStorage !== 'undefined'
  ? localStorage.getItem('yumyum:soundEnabled') !== 'false'
  : true;

/**
 * 取得或建立 AudioContext
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * 播放落子音效 - 短促的敲擊聲
 */
function playPlaceSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.1);
}

/**
 * 播放吃子音效 - 更有力的吞噬音
 */
function playCaptureSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // 主音
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(600, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);

  gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.15);

  // 低音加強
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();

  bass.connect(bassGain);
  bassGain.connect(ctx.destination);

  bass.type = 'sine';
  bass.frequency.setValueAtTime(150, ctx.currentTime);
  bass.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);

  bassGain.gain.setValueAtTime(0.2, ctx.currentTime);
  bassGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  bass.start(ctx.currentTime);
  bass.stop(ctx.currentTime + 0.2);
}

/**
 * 播放獲勝音效 - 歡樂的上升音階
 */
function playWinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

    gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.1 + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.1 + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);

    oscillator.start(ctx.currentTime + i * 0.1);
    oscillator.stop(ctx.currentTime + i * 0.1 + 0.3);
  });
}

/**
 * 播放失敗音效 - 低沉的下降音
 */
function playLoseSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [392, 349.23, 293.66, 261.63]; // G4, F4, D4, C4

  notes.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);

    gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
    gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.15 + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.25);

    oscillator.start(ctx.currentTime + i * 0.15);
    oscillator.stop(ctx.currentTime + i * 0.15 + 0.25);
  });
}

/**
 * 播放指定類型的音效
 */
export function playSound(type: SoundType): void {
  if (!soundEnabled) return;

  // 嘗試恢復 AudioContext（某些瀏覽器需要用戶互動後才能播放）
  const ctx = getAudioContext();
  if (ctx?.state === 'suspended') {
    ctx.resume();
  }

  switch (type) {
    case 'place':
      playPlaceSound();
      break;
    case 'capture':
      playCaptureSound();
      break;
    case 'win':
      playWinSound();
      break;
    case 'lose':
      playLoseSound();
      break;
  }
}

/**
 * 設定音效開關
 */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('yumyum:soundEnabled', String(enabled));
  }
}

/**
 * 取得音效是否開啟
 */
export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/**
 * 切換音效開關
 */
export function toggleSound(): boolean {
  const newState = !soundEnabled;
  setSoundEnabled(newState);
  return newState;
}
