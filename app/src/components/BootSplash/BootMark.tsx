import { Image } from 'react-native';
export function BootMark({ dark, onSettled }: { dark: boolean; onSettled: () => void }) {
  return <Image accessible={false} source={dark ? require('../../../assets/splash-icon-dark.png') : require('../../../assets/splash-icon.png')} style={{ width: 96, height: 96 }} resizeMode="contain" onLoadEnd={onSettled} />;
}
