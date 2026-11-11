import { Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Icon, Text } from '../components/ui';
import { BrandRow } from '../components/Brand';
import { colors, radius, shadow } from '../theme';

export const WELCOME_KEY = 'qs:welcomed';
const markSeen = () => AsyncStorage.setItem(WELCOME_KEY, '1').catch(() => {});

const FEATURES = [
  ['storefront-outline', 'Nhận tại quầy', 'Không chờ đợi', colors.okBg, colors.secondary],
  ['leaf-outline', '100% Tươi', 'Chuẩn chọn lọc', colors.surfaceLow, colors.secondary],
  ['wallet-outline', 'Tích điểm', 'Mỗi đơn hàng', colors.surfaceLow, colors.tertiary],
];

// Màn hình chào mừng lần đầu mở app (thiết kế "Chào mừng đến với Quick!")
export function WelcomeScreen({ navigation }) {
  const go = async (target) => { await markSeen(); navigation.replace('Tabs'); if (target) navigation.navigate(target); };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <BrandRow />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceContainer, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary }} />
            <Text style={{ color: colors.secondary, fontWeight: '700', fontSize: 12 }}>Nhận tại quầy</Text>
          </View>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: radius.xl, padding: 18, gap: 14, borderWidth: 1, borderColor: colors.border, ...shadow }}>
          <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, backgroundColor: colors.tertiaryFixed, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
            <Icon name="gift-outline" size={16} color={colors.onTertiaryFixed} />
            <Text style={{ color: colors.onTertiaryFixed, fontWeight: '700', fontSize: 13 }}>Thành viên tích điểm mỗi đơn</Text>
          </View>
          <View style={{ alignSelf: 'center' }}>
            <Image source={require('../../assets/mascot.png')} style={{ width: 230, height: 230, borderRadius: radius.lg }} />
            <View style={{ position: 'absolute', left: 8, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, ...shadow }}>
              <Icon name="bag-check-outline" size={15} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Đặt trước</Text>
            </View>
            <View style={{ position: 'absolute', right: 6, top: 6, width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow }}>
              <Icon name="leaf-outline" size={18} color={colors.secondary} />
            </View>
          </View>
          <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '900', color: colors.text, textAlign: 'center' }}>Chào mừng đến với <Text style={{ fontSize: 28, fontWeight: '900', color: colors.primary }}>Quick!</Text></Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textVariant, textAlign: 'center' }}>
            Mua sắm tiện lợi, mỗi ngày thêm vui. Đặt hàng trên app, ghé cửa hàng nhận ngay <Text style={{ fontWeight: '700', color: colors.text }}>không phải chờ</Text> và tích điểm cho mỗi đơn.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FEATURES.map(([icon, t, d, bg, fg]) => (
              <View key={t} style={{ flex: 1, backgroundColor: bg, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', gap: 4 }}>
                <Icon name={icon} size={22} color={fg} />
                <Text style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>{t}</Text>
                <Text style={{ fontSize: 11, color: colors.textVariant }}>{d}</Text>
              </View>
            ))}
          </View>
        </View>

        <Button title="Đăng nhập" icon="log-in-outline" onPress={() => go('Login')} style={{ paddingVertical: 16 }} />
        <Button title="Tạo tài khoản mới" icon="person-add-outline" variant="white" onPress={() => go('Register')} style={{ paddingVertical: 16, borderWidth: 1, borderColor: colors.border }} />
        <Pressable onPress={() => go(null)} style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8 }}>
          <Text style={{ color: colors.textVariant, fontSize: 15 }}>Khám phá ngay không cần tài khoản</Text>
          <Icon name="arrow-forward" size={18} color={colors.textVariant} />
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}><Icon name="shield-checkmark-outline" size={15} color={colors.secondary} /><Text style={{ fontSize: 12, color: colors.textVariant, fontWeight: '600' }}>Bảo mật & Tươi mới</Text></View>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}><Icon name="headset-outline" size={15} color={colors.primary} /><Text style={{ fontSize: 12, color: colors.textVariant, fontWeight: '600' }}>Hỗ trợ trong app</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
