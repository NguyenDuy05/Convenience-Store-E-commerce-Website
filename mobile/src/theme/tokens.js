export const colors = {
  blue: '#3882F6',
  blueText: '#1558B8',
  bright: '#3882F6',
  lime: '#A7E67A',
  yellow: '#FFE58A',
  sky: '#EAF6FF',
  ink: '#19244E',
  muted: '#59647B',
  paper: '#EAF6FF',
  line: '#DFE6F1',
  white: '#FFFFFF',
  danger: '#B42336',
  success: '#266B37',
  successSoft: '#EEF9E7',
  dangerSoft: '#FFF0F1',
  yellowSoft: '#FFF8DA',
  blueSoft: '#F1F6FF',
  placeholder: '#728099',
  overlay: 'rgba(25,36,78,0.4)',
  transparent: 'transparent',
};
export const space = { xs: 4, sm: 8, compact: 12, md: 16, page: 16, lg: 24, xl: 32, xxl: 40 };
export const radius = { sm: 10, md: 14, lg: 18, xl: 20, pill: 999 };
export const typography = {
  display: { fontFamily: 'Baloo', fontSize: 32, lineHeight: 38 },
  h1: { fontFamily: 'Baloo', fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: 'Baloo', fontSize: 20, lineHeight: 26 },
  h3: { fontFamily: 'Baloo', fontSize: 18, lineHeight: 24 },
  bodyLarge: { fontFamily: 'Inter', fontSize: 18, lineHeight: 27 },
  body: { fontFamily: 'Inter', fontSize: 15, lineHeight: 23 },
  caption: { fontFamily: 'Inter', fontSize: 12, lineHeight: 18 },
  button: { fontFamily: 'Inter', fontSize: 15, lineHeight: 22, fontWeight: '700' },
};
export const shadow = {
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
};
export const motion = { press: 100, quick: 180, screen: 280, gentle: 550 };
export const layout = { touch: 48, page: 16, maxWidth: 1040, formWidth: 760, icon: 22 };
