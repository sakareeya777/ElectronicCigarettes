import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ref, set } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import { useUserAuth } from '../context/UserAuthContext';

export default function AdminAddNews({ navigation }) {
  const { user } = useUserAuth() || {};
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    console.log('Submit function called'); // ตรวจสอบว่าฟังก์ชันถูกเรียกใช้
    if (!user) {
      Alert.alert('Unauthorized', 'กรุณาเข้าสู่ระบบก่อนดำเนินการ');
      navigation && navigation.navigate && navigation.navigate('Login');
      return;
    }
    if (!title.trim()) {
      Alert.alert('กรุณากรอกหัวข้อข่าว');
      return;
    }
    setLoading(true);
    try {
      console.log('Preparing to add news to Realtime Database'); // ตรวจสอบว่าถึงจุดนี้
      const newsRef = ref(database, `news/${Date.now()}`);
      console.log('News reference created:', newsRef); // ตรวจสอบว่า newsRef ถูกสร้าง
      await set(newsRef, {
        title: title.trim(),
        description: description.trim() || null,
        url: url.trim() || null,
        thumbnail: thumbnail.trim() || null,
        createdAt: new Date().toISOString(),
      });
      console.log('News added successfully'); // ตรวจสอบว่าข้อมูลถูกเพิ่ม
      setTitle(''); setUrl(''); setThumbnail(''); setDescription('');
      Alert.alert('บันทึกสำเร็จ', 'ข่าวถูกเพิ่มแล้ว');
      if (navigation && navigation.goBack) navigation.goBack();
    } catch (e) {
      console.error('Failed to add news', e);
      const msg = (e && e.message) ? e.message : String(e);
      Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกข่าวได้: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>หน้าแอดมิน: เพิ่มข่าว</Text>

      <Text style={styles.label}>หัวข้อ</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="หัวข้อข่าว" />

      <Text style={styles.label}>ลิงก์ (URL)</Text>
      <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://..." autoCapitalize="none" />

      <Text style={styles.label}>คำอธิบาย (description)</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="คำอธิบายสั้นๆ" />

      <Text style={styles.label}>รูปภาพ thumbnail (optional)</Text>
      <TextInput style={styles.input} value={thumbnail} onChangeText={setThumbnail} placeholder="https://..." autoCapitalize="none" />

      <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>บันทึกข่าว</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { marginTop: 8, color: '#333', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginTop: 6 },
  button: { marginTop: 16, backgroundColor: '#229954', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
