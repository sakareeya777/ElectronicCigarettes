import React, { useState } from 'react';
import { TouchableOpacity, Modal, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native'; 


export default function HamburgerMenu() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const params = route?.params;

  const notLoggedIn = !params || !params.name || !params.email;

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <Icon name="menu" size={32} color="#bbb" />
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.menu}>
            {notLoggedIn && (
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