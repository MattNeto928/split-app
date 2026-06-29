import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { personColor } from '@/constants/Colors';

export type AvatarProps = {
  name: string;
  index?: number;
  size?: number;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, index = 0, size = 40 }: AvatarProps) {
  const { fg, bg } = personColor(index);
  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
    >
      <ThemedText
        type="defaultSemiBold"
        style={[styles.initials, { color: fg, fontSize: size * 0.4 }]}
      >
        {initials}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    includeFontPadding: false,
  },
});

export default Avatar;
