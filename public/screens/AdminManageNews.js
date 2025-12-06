import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { ref, onValue, remove } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import { useUserAuth } from '../context/UserAuthContext';

export default function AdminManageNews({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useUserAuth() || {};

  useEffect(() => {
    if (!user) {
      // redirect to login if not authenticated
      navigation && navigation.navigate && navigation.navigate('Login');
      return;
    }
    const newsRef = ref(database, 'news');
    const unsub = onValue(newsRef, snap => {
      const data = snap.val();
      let arr = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
      // sort by createdAt desc if available
      arr.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
      setItems(arr);
      setLoading(false);
    }, err => {
      console.error('news onValue error', err);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const confirmDelete = (id) => {
    Alert.alert('ลบข่าว', 'คุณแน่ใจว่าจะลบข่าวนี้หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: () => doDelete(id) }
    ]);
  };

  const doDelete = async (id) => {
    if (!user) { Alert.alert('Unauthorized', 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'); navigation && navigation.navigate && navigation.navigate('Login'); return; }
    try {
      await remove(ref(database, `news/${id}`));
      // onValue will update list automatically
    } catch (e) {
      console.error('Failed to delete', e);
      Alert.alert('ผิดพลาด', 'ไม่สามารถลบข่าวได้');
    }
  };

  const renderRow = ({ item }) => {
    const created = item.createdAt && item.createdAt.toDate ? item.createdAt.toDate().toLocaleString() : '';
    return (
      <View style={styles.row}>
        <Image source={{ uri: item.thumbnail || 'https://via.placeholder.com/80' }} style={styles.thumb} />
        <View style={styles.meta}>
          <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
          {item.description ? <Text numberOfLines={2} style={styles.desc}>{item.description}</Text> : null}
          <Text numberOfLines={1} style={styles.url}>{item.url}</Text>
          <Text style={styles.ts}>{created}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('AdminEditNews', { id: item.id })}>
            <Text style={styles.actionText}>แก้ไข</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item.id)}>
            <Text style={styles.actionText}>ลบ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>จัดการข่าว</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => {
          if (!user) { Alert.alert('Unauthorized', 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'); navigation && navigation.navigate && navigation.navigate('Login'); return; }
          navigation.navigate('AdminAddNews');
        }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>เพิ่มข่าว</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#229954" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderRow}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  header: { fontSize: 18, fontWeight: '700' },
  addBtn: { backgroundColor: '#229954', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
  thumb: { width: 80, height: 60, borderRadius: 6, backgroundColor: '#f0f0f0' },
  meta: { flex: 1, marginLeft: 10 },
  title: { fontWeight: '700' },
  desc: { color: '#444', fontSize: 13, marginTop: 4 },
  url: { color: '#666', fontSize: 12, marginTop: 4 },
  ts: { color: '#999', fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#ffd54f', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 6 },
  deleteBtn: { backgroundColor: '#ff6b6b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionText: { color: '#000', fontWeight: '700' },
});
