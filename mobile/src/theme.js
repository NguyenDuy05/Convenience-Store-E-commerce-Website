// Token màu / bo góc / đổ bóng theo DESIGN.md "Quick Convenience" (đồng bộ với token --qk-* của web)
export const colors = {
  primary: '#0058bc', primaryDark: '#004494', primaryContainer: '#1c71e4', primaryFixed: '#d8e2ff', primaryFixedDim: '#adc6ff',
  secondary: '#356b0a', secondaryContainer: '#b4f486', onSecondaryContainer: '#3b7112', secondaryDim: '#99d76d',
  tertiary: '#6f5d0e', tertiaryFixed: '#fbe187', tertiaryContainer: '#c1aa56', onTertiaryFixed: '#221b00',
  error: '#ba1a1a', errorContainer: '#ffdad6', onErrorContainer: '#93000a',
  text: '#0e1c31', textVariant: '#424754', outline: '#727785', outlineVariant: '#c2c6d6', border: '#e2e8f0',
  bg: '#f9f9ff', surface: '#ffffff', surfaceLow: '#f0f3ff', surfaceContainer: '#e8eeff', surfaceHigh: '#dfe8ff', surfaceHighest: '#d6e3ff',
  inverseSurface: '#243147', star: '#e8a400',
  warnBg: '#fbe187', warnText: '#4c3e00', infoBg: '#d8e2ff', infoText: '#004494',
  okBg: '#d9f8c0', okText: '#245100', neutralBg: '#e8eeff', neutralText: '#424754', errBg: '#ffdad6', errText: '#93000a',
};
export const radius = { sm: 8, md: 16, lg: 24, xl: 32, pill: 999 };
export const shadow = { shadowColor: '#3882f6', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 };
export const shadowLg = { shadowColor: '#17243a', shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 8 };
export const TONES = {
  warn: [colors.warnBg, colors.warnText], info: [colors.infoBg, colors.infoText], success: [colors.okBg, colors.okText],
  neutral: [colors.neutralBg, colors.neutralText], error: [colors.errBg, colors.errText],
};
export const fonts = {
  regular: 'Inter_400Regular', medium: 'Inter_500Medium', semi: 'Inter_600SemiBold', bold: 'Inter_700Bold',
  display: 'PlusJakartaSans_800ExtraBold', displayBold: 'PlusJakartaSans_700Bold',
};
