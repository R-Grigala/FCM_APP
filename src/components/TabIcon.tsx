import { Image } from 'react-native';
import { SvgUri } from 'react-native-svg';

const iconSources = {
  home: require('../../assets/icons/home.svg'),
  reports: require('../../assets/icons/reports.svg'),
  settings: require('../../assets/icons/settings.svg'),
} as const;

type TabIconName = keyof typeof iconSources;

type TabIconProps = {
  name: TabIconName;
  color: string;
  size: number;
};

export function TabIcon({ name, color, size }: TabIconProps) {
  const source = Image.resolveAssetSource(iconSources[name]);

  return <SvgUri uri={source.uri} width={size} height={size} color={color} />;
}
