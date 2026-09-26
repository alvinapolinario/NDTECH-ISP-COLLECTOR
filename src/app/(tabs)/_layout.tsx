import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { colors } from '@/components/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen name="accounts" options={{ title: 'Accounts', tabBarIcon: tabIcon('people-outline') }} />
      <Tabs.Screen name="collections" options={{ title: 'Collections', tabBarIcon: tabIcon('receipt-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Me', tabBarIcon: tabIcon('person-circle-outline') }} />
    </Tabs>
  );
}
