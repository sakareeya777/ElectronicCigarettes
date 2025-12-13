import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { ref, get, update } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import { useUserAuth } from '../context/UserAuthContext';

export default function AdminEditNews({ route, navigation }) {
  const { id } = route.params || {};
  const { user } = useUserAuth() || {};
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) {
        navigation && navigation.navigate && navigation.navigate('Login');
        return;
      }
      if (!id) return;
      setLoading(true);
      try {
        const nref = ref(database, `news/${id}`);
        const snap = await get(nref);
        if (!mounted) return;
        if (snap && snap.exists && snap.exists()) {
          const data = snap.val();
          setTitle(data.title || '');
          setUrl(data.url || '');
          setThumbnail(data.thumbnail || '');
          setDescription(data.description || '');
        } else {
          Alert.alert('ไม่พบข่าว', 'ข่าวที่ต้องการแก้ไขไม่พบ');
          navigation.goBack();
        }
      } catch (e) {
        console.error('Load news failed', e);
        Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้');
        navigation.goBack();
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  const submit = async () => {
    if (!user) { Alert.alert('Unauthorized', 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'); navigation && navigation.navigate && navigation.navigate('Login'); return; }
    if (!title.trim()) { Alert.alert('กรุณากรอกหัวข้อข่าว'); return; }
    setSaving(true);
    try {
      const nref = ref(database, `news/${id}`);
      await update(nref, {
        title: title.trim(),
        description: description.trim() || null,
        url: url.trim() || null,
        thumbnail: thumbnail.trim() || null,
        updatedAt: new Date().toISOString(),
      });
      Alert.alert('บันทึกสำเร็จ');
      navigation.goBack();
    } catch (e) {
      console.error('Update failed', e);
      Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกการแก้ไขได้');
    } finally {
      setSaving(false);
    }
  };

  function handleBack() {
    try {
      if (navigation && typeof navigation.goBack === 'function') return navigation.goBack();
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history && window.history.length) return window.history.back();
    } catch (e) {
      console.warn('Back navigation failed', e);
    }
  }

  if (loading) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large" color="#229954"/></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}><Text style={styles.backText}>กลับ</Text></TouchableOpacity>
        <Text style={styles.header}>แก้ไขข่าว</Text>
        <View style={{ width: 48 }} />
      </View>
      <Text style={styles.label}>หัวข้อ</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <Text style={styles.label}>คำอธิบาย (description)</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} />
      <Text style={styles.label}>ลิงก์</Text>
      <TextInput style={styles.input} value={url} onChangeText={setUrl} autoCapitalize="none" />
      <Text style={styles.label}>Thumbnail</Text>
      <TextInput style={styles.input} value={thumbnail} onChangeText={setThumbnail} autoCapitalize="none" />
      <TouchableOpacity style={styles.button} onPress={submit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>บันทึกการแก้ไข</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:16, backgroundColor:'#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  header: { fontSize:18, fontWeight:'700' },
  backBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  backText: { color: '#333', fontWeight: '600' },
  label: { marginTop:8, color:'#333', fontWeight:'600' },
  input: { borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10, marginTop:6 },
  button: { marginTop:16, backgroundColor:'#229954', padding:12, borderRadius:8, alignItems:'center' },
  buttonText: { color:'#fff', fontWeight:'700' }
});
