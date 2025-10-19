import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Switch } from 'react-native';
import { CommonActions } from '@react-navigation/native';

export default function ProfileScreen({ route, navigation }) {
  const params = route?.params || {};
  return (
    <View style={styles.container}>
      <Text style={styles.header}>ข้อมูลส่วนตัว</Text>
      <View style={styles.profilePicContainer}>
        
      </View>
      <View style={styles.pointContainer}>
        <Text style={styles.pointText}>Point +999</Text>
        <Text style={styles.addText}>เพิ่มแต้ม</Text>
      </View>
      <TouchableOpacity
        style={styles.couponButton}
        onPress={() => {
          navigation.navigate('CouponExchange', { point: 999 });
        }}
      >
        <Text style={styles.couponText}>แลกคูปอง</Text>
      </TouchableOpacity>
      <View style={styles.infoBox}>
        <View style={styles.inputBox}>
          <Text style={styles.label}>ชื่อผู้ใช้</Text>
          <Text style={styles.inputText}>{params.name}</Text>
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.inputText}>{params._id ? params._id : "ไม่พบไอดี"}</Text>
        </View>
      </View>
      <View style={styles.socialBox}>
        <Text style={styles.socialLabel}>บัญชีที่เข้าสู่ระบบ</Text>
        <View style={styles.socialRow}>
          
          <Text style={styles.socialText}>GOOGLE</Text>
          <Text style={styles.socialEmail}>{params.email}</Text>
        </View>
      </View>
      <View style={styles.socialBox}>
        <Text style={styles.socialLabel}>เข้าสู่ระบบด้วยบัญชีอื่น</Text>
        <View style={styles.socialRow}>
          
          <Text style={styles.socialText}>FACEBOOK</Text>
          <Switch value={false} />
        </View>
        <View style={styles.socialRow}>
          
          <Text style={styles.socialText}>APPLE ID</Text>
          <Switch value={false} />
        </View>
      </View>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          );
        }}
      >
        <Text style={styles.logoutText}>ออกจากระบบ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FFF4', 
    alignItems: 'center', 
    paddingTop: 40 
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#7AC143', 
    marginBottom: 16, 
    letterSpacing: 1 
  },
  profilePicContainer: { 
    marginBottom: 14, 
    shadowColor: '#7AC143', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.18, 
    shadowRadius: 8, 
    elevation: 6, 
    backgroundColor: '#fff', 
    borderRadius: 50, 
    padding: 6 
  },
  profilePic: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#fff' 
  },
  pointContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12 
  },
  pointText: { 
    backgroundColor: '#F58220', 
    color: '#fff', 
    borderRadius: 12, 
    paddingHorizontal: 18, 
    paddingVertical: 8, 
    fontWeight: 'bold', 
    marginRight: 10, 
    fontSize: 16, 
    elevation: 2 
  },
  addText: { 
    color: '#7AC143', 
    fontSize: 13, 
    fontWeight: 'bold' 
  },
  couponButton: {
    backgroundColor: '#7AC143',
    borderRadius: 16,
    paddingVertical: 12,
    width: '80%',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#7AC143',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  couponText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  infoBox: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#7AC143',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  inputBox: { 
    marginBottom: 10 
  },
  label: { 
    color: '#7AC143', 
    fontWeight: 'bold', 
    marginBottom: 2, 
    fontSize: 15 
  },
  inputText: { 
    color: '#F58220', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  socialBox: { 
    width: '85%', 
    marginBottom: 12 
  },
  socialLabel: { 
    color: '#7AC143', 
    fontWeight: 'bold', 
    marginBottom: 4, 
    fontSize: 15 
  },
  socialRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  socialIcon: { 
    width: 26, 
    height: 26, 
    marginRight: 10 
  },
  socialText: { 
    color: '#F58220', 
    fontWeight: 'bold', 
    marginRight: 8, 
    fontSize: 15 
  },
  socialEmail: { 
    color: '#58595B', 
    fontSize: 14 
  },
  logoutButton: { 
    backgroundColor: '#F58220', 
    borderRadius: 16, 
    paddingVertical: 14, 
    width: '80%', 
    alignItems: 'center', 
    marginTop: 24, 
    shadowColor: '#F58220', 
    shadowOpacity: 0.18, 
    shadowRadius: 6, 
    elevation: 4 
  },
  logoutText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 18,
    letterSpacing: 1 
  },
});