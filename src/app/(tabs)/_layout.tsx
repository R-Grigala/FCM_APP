import { Tabs } from 'expo-router';

import { TabIcon } from '../../components/TabIcon';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0F4C81',
        tabBarInactiveTintColor: '#5E7088',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#D9E2EC',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'მთავარი',
          tabBarLabel: 'მთავარი',
          tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'რეპორტები',
          tabBarLabel: 'რეპორტები',
          tabBarIcon: ({ color, size }) => <TabIcon name="reports" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'პარამეტრები',
          tabBarLabel: 'პარამეტრები',
          tabBarIcon: ({ color, size }) => <TabIcon name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
