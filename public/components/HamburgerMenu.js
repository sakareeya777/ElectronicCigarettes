import React, { useState } from 'react';
import { TouchableOpacity, Modal, View, Text, StyleSheet } from 'react-native';
import { IoMenu } from 'react-icons/io5';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUserAuth } from '../context/UserAuthContext'; 


export default function HamburgerMenu() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const params = route?.params;
  const {logout, user} = useUserAuth();

  // Use user from context to determine login state
  const loggedIn = !!user;

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <IoMenu size={32} color="#bbb" />
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.menu}>
            {loggedIn ? (
              <Text
                style={styles.menuItem}
                onPress={async () => {
                  setVisible(false);
                  await logout();
                  navigation.navigate('Login');
                }}
              >
                Logout
              </Text>
            ) : (
              <>
                <Text
                  style={styles.menuItem}
                  onPress={() => {
                    setVisible(false);
                    navigation.navigate('Login'); 
                  }}
                >
                  Login
                </Text>
                <Text
                  style={styles.menuItem}
                  onPress={() => {
                    setVisible(false);
                    navigation.navigate('Register'); 
                  }}
                >
                  Register
                </Text>
              </>
            )}
            <Text style={styles.menuItem} onPress={() => setVisible(false)}>
              Close
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  menuItem: {
    fontSize: 18, paddingVertical: 12, color: '#333',
  },
});