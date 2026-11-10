// RN dimensions are logical points, not the emulator framebuffer's physical pixels.
export function catalogLayout(width, height, fontScale = 1) {
  const frameWidth = Math.min(width, 1040);
  const columns = width < 300 || fontScale >= 1.6 ? 1 : width >= 1000 && height >= 768 ? 3 : 2;
  const gap = 12,
    padding = 16;
  return {
    columns,
    frameWidth,
    gap,
    padding,
    cardWidth: (frameWidth - padding * 2 - gap * (columns - 1)) / columns,
  };
}
