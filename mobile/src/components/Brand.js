import { View } from 'react-native';
import { Icon, Text } from './ui';
import { colors } from '../theme';

// Logo Quick: vòng tròn xanh + tia sét xanh lá, kèm chữ thương hiệu
export function LogoMark({ size = 44 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', borderWidth: size / 12, borderColor: colors.primaryFixed }}>
      <Icon name="flash" size={size * 0.5} color={colors.secondaryContainer} />
    </View>
  );
}

export function BrandRow({ subtitle = 'CONVENIENCE STORE', size = 44 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      <View>
        <Text style={{ fontSize: size * 0.55, lineHeight: size * 0.62, fontWeight: '900', color: colors.primary }}>Quick</Text>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: colors.textVariant }}>{subtitle}</Text>
      </View>
    </View>
  );
}
