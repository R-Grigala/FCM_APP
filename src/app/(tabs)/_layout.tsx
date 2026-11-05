import { Tabs } from 'expo-router';

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
      <Tabs.Screen name="index" options={{ title: 'მთავარი', tabBarLabel: 'მთავარი' }} />
      <Tabs.Screen name="settings" options={{ title: 'პარამეტრები', tabBarLabel: 'პარამეტრები' }} />
    </Tabs>
  );
}
