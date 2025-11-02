import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { IoHomeOutline, IoDocumentOutline, IoCameraOutline, IoCallOutline } from 'react-icons/io5';
import HomeScreen from './screens/HomeScreen';
import FormScreen from './screens/FormScreen';
import CameraScreen from './screens/CameraScreen';
import Login from './login/Login';
import Register from './register/Register';
import ProfileScreen from './screens/ProfileScreen';
import UserAuthContextProvider from './context/UserAuthContext';


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home') return <IoHomeOutline size={size} color={color} />;
          if (route.name === 'Form') return <IoDocumentOutline size={size} color={color} />;
          if (route.name === 'Camera') return <IoCameraOutline size={size} color={color} />;
          if (route.name === 'Call') return <IoCallOutline size={size} color={color} />;
          return null;
        },
        tabBarActiveTintColor: '#ff6600',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Form" component={FormScreen} />
      <Tab.Screen name="Camera" component={CameraScreen} />
      {/* Call Tab: prevent navigation and trigger phone call */}
      <Tab.Screen
        name="Call"
        component={HomeScreen}
        listeners={{
          tabPress: e => {
            // prevent default navigation
            e.preventDefault();
            // initiate phone call (tel: link)
            window.location.href = 'tel:191';
          },
        }}
        options={{ tabBarLabel: 'Call' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <UserAuthContextProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </UserAuthContextProvider>
  );
}
