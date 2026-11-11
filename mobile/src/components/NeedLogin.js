import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Empty } from './ui';
import { colors } from '../theme';

export default function NeedLogin({ title = 'Bạn chưa đăng nhập', text = 'Đăng nhập để sử dụng chức năng này.' }) {
  const nav = useNavigation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Empty icon="lock-closed-outline" title={title} text={text} action={
        <View style={{ gap: 10, alignItems: 'stretch', minWidth: 220 }}>
          <Button title="Đăng nhập" icon="log-in-outline" onPress={() => nav.navigate('Login')} />
          <Button title="Tạo tài khoản" variant="ghost" onPress={() => nav.navigate('Register')} />
        </View>} />
    </SafeAreaView>
  );
}
