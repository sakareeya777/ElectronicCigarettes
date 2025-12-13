import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { ref, set } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import { useUserAuth } from '../context/UserAuthContext';

export default function AdminAddNews({ navigation }) {
  const { user } = useUserAuth() || {};

  function handleBack() {
    try {
      if (navigation && typeof navigation.goBack === 'function') return navigation.goBack();
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history && window.history.length) return window.history.back();
    } catch (e) {
      console.warn('Back navigation failed', e);
    }
  }
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
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backText}>กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.header}>เพิ่มข่าว</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.card}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FDEEF2' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  header: { fontSize: 18, fontWeight: '700', color: '#111' },
  backBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  backText: { color: '#333', fontWeight: '600' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  label: { marginTop: 8, color: '#333', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginTop: 6, backgroundColor: '#fff' },
  button: { marginTop: 16, backgroundColor: '#229954', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
