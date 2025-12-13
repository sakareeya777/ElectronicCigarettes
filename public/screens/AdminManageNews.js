import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { ref, onValue, remove } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import { useUserAuth } from '../context/UserAuthContext';

export default function AdminManageNews({ navigation }) {
  const { user } = useUserAuth() || {};
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  function handleBack() {
    try {
      if (navigation && typeof navigation.goBack === 'function') return navigation.goBack();
      if (typeof window !== 'undefined' && window.history && window.history.length) return window.history.back();
    } catch (e) {
      console.warn('Back navigation failed', e);
    }
  }

  if (!user) {
    navigation && navigation.navigate && navigation.navigate('Login');
    return null;
  }

  useEffect(() => {
    const nref = ref(database, 'news');
    const unsub = onValue(nref, snapshot => {
      const val = snapshot && snapshot.val();
      if (!val) {
        setNews([]);
        setLoading(false);
        return;
      }
      const items = Object.keys(val).map(k => ({ id: k, ...(val[k] || {}) })).sort((a,b)=> (b.updatedAt||0) > (a.updatedAt||0) ? 1 : -1);
      setNews(items);
      setLoading(false);
    }, err => {
      console.error('Failed to load news list', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = (item) => {
    Alert.alert('ลบข่าว', 'ต้องการลบข่าวนี้จริงหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
        try {
          await remove(ref(database, `news/${item.id}`));
          Alert.alert('ลบสำเร็จ');
        } catch (e) {
          console.error('Delete failed', e);
          Alert.alert('ผิดพลาด', 'ไม่สามารถลบข่าวได้');
        }
      } }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.newsRow}>
      {item.thumbnail ? <Image source={{ uri: item.thumbnail }} style={styles.thumb} /> : <View style={styles.thumbPlaceholder}><Text style={{color:'#fff'}}>IMG</Text></View>}
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.newsTitle}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.newsDesc}>{item.description || ''}</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity style={styles.editSmall} onPress={() => navigation && navigation.navigate && navigation.navigate('AdminEditNews', { id: item.id })}>
            <Text style={styles.editText}>แก้ไข</Text>
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          <TouchableOpacity style={styles.deleteSmall} onPress={() => handleDelete(item)}>
            <Text style={styles.deleteTextSmall}>ลบ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backText}>กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.header}>จัดการข่าว</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={{ height: 8 }} />

      <View style={styles.card}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation && navigation.navigate && navigation.navigate('AdminAddNews')}>
          <Text style={styles.btnText}>เพิ่มข่าว</Text>
        </TouchableOpacity>

        <View style={{ height: 12 }} />

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation && navigation.navigate && navigation.navigate('AdminReport')}>
          <Text style={styles.btnText}>รายงาน</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 12 }} />

      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={news}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          // On web, give the list an explicit height so it becomes scrollable inside the page
          style={Platform.OS === 'web' ? { height: Dimensions.get('window').height - 220 } : undefined}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FDEEF2' },
  scrollContainer: { padding: 16, backgroundColor: '#FDEEF2', paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  header: { fontSize: 18, fontWeight: '700', color: '#111' },
  backBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  backText: { color: '#333', fontWeight: '600' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  primaryBtn: { backgroundColor: '#229954', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  secondaryBtn: { backgroundColor: '#1e88e5', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
  ,
  newsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#eee' },
  thumbPlaceholder: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  newsTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  newsDesc: { color: '#666', marginTop: 4 },
  editSmall: { backgroundColor: '#ffd966', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  editText: { color: '#333', fontWeight: '700' },
  deleteSmall: { backgroundColor: '#ff5a5f', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  deleteTextSmall: { color: '#fff', fontWeight: '700' }
});
