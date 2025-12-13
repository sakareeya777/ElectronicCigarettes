import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useUserAuth } from '../context/UserAuthContext';
import { ref, onValue, get } from '../firebase/firebaseConfig';
import { database /*, db */ } from '../firebase/firebaseConfig';

export default function AdminReport({ navigation }) {
  const { user } = useUserAuth() || {};
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [permissionError, setPermissionError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigation && navigation.navigate && navigation.navigate('Login');
      return;
    }

    let mounted = true;
    (async () => {
      try {
        // require admin flag in Realtime Database before subscribing (backend scripts create RTDB keys)
        const adminRef = ref(database, `admins/${user.uid}`);
        const adminSnap = await get(adminRef);
        const isAdmin = adminSnap && adminSnap.exists() && !!adminSnap.val();
        if (!isAdmin) {
          if (mounted) {
            setItems([]);
            setPermissionError('คุณไม่มีสิทธิ์เข้าดูรายงาน');
            setLoading(false);
          }
          return;
        }

        const r = ref(database, 'reports');
        const unsub = onValue(r, snap => {
          if (!mounted) return;
          const data = snap.val();
          const arr = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
          arr.sort((a, b) => {
            const ta = a.created_at ? Date.parse(a.created_at) : 0;
            const tb = b.created_at ? Date.parse(b.created_at) : 0;
            return tb - ta;
          });
          setItems(arr);
          setLoading(false);
        }, err => {
          console.error('AdminReport onValue error', err);
          if (mounted) {
            setPermissionError(err && err.message ? err.message : 'ไม่สามารถอ่านรายงานได้');
            setLoading(false);
          }
        });

        // cleanup
        return () => {
          mounted = false;
          try { unsub(); } catch (e) { }
        };
      } catch (e) {
        console.error('AdminReport init error', e);
        if (mounted) {
          const msg = e && e.code === 'permission-denied' ? 'ไม่มีสิทธิ์เข้าถึง /reports' : (e && e.message) || 'เกิดข้อผิดพลาด';
          setPermissionError(msg);
          setLoading(false);
        }
      }
    })();

    return () => { mounted = false; };
  }, [user]);

  function formatDateTime(item) {
    const src = item.created_at || (item.date && item.time ? `${item.date} ${item.time}` : (item.date || item.time));
    if (!src) return '';
    const d = new Date(src);
    if (!isNaN(d)) return d.toLocaleString();
    return src;
  }

  function handleBack() {
    try {
      if (navigation && typeof navigation.goBack === 'function') return navigation.goBack();
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history && window.history.length) return window.history.back();
    } catch (e) {
      console.warn('Back navigation failed', e);
    }
  }

  const renderRow = ({ item }) => {
    const reporter = item.reporter;
    const media = item.media;
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={() => { console.log('open report', item.id); }}>
        {media && media.uri && media.mediaType && media.mediaType.startsWith('image') ? (
          <MediaThumb uri={media.uri} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbPlaceholderText}>ไม่มีรูป</Text>
          </View>
        )}
        <View style={styles.meta}>
          <View style={styles.headerRow}>
            <Text style={styles.type} numberOfLines={1} ellipsizeMode="tail">{item.type || '—'}</Text>
            <Text style={styles.date} numberOfLines={1} ellipsizeMode="tail">{formatDateTime(item)}</Text>
          </View>
          {item.location ? <Text style={styles.location} numberOfLines={1} ellipsizeMode="tail">{item.location}</Text> : null}
          {item.coords ? <Text style={styles.coords} numberOfLines={1} ellipsizeMode="tail">{item.coords}</Text> : null}
          <Text style={styles.desc} numberOfLines={2} ellipsizeMode="tail">{item.description}</Text>
          {reporter ? <Text style={styles.reporter} numberOfLines={1} ellipsizeMode="tail">ผู้ส่ง: {reporter.name || 'ระบุไม่ครบ'} {reporter.contact ? `(${reporter.contact})` : ''}</Text> : <Text style={styles.reporter}>ส่งแบบไม่ระบุตัวตน</Text>}
        </View>
        </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backText}>กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.header}>รายงาน</Text>
        <View style={{ width: 48 }} />
      </View>
      {!loading && !permissionError ? <Text style={styles.count}>{items.length} รายงาน</Text> : null}
      {loading ? (
        <ActivityIndicator size="large" color="#229954" style={{ marginTop: 24 }} />
      ) : permissionError ? (
        <Text style={{ marginTop: 12, color: '#b00020' }}>{permissionError}</Text>
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>ยังไม่มีรายงาน</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderRow}
          // on web give list an explicit height so it can scroll independently
          style={Platform.OS === 'web' ? { height: Dimensions.get('window').height - 220 } : undefined}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

function MediaThumb({ uri, style }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!uri) return;
    // Directly use non-blob URIs
    if (!uri.startsWith || !uri.startsWith('blob:')) {
      setSrc(uri);
      return () => { mounted = false; };
    }

    // For blob: URLs (local blob references) fetch and convert to data URL
    (async () => {
      try {
        const resp = await fetch(uri);
        const blob = await resp.blob();
        if (!mounted) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!mounted) return;
          setSrc(reader.result);
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        console.warn('MediaThumb: failed to load blob uri', e);
        if (mounted) setSrc(null);
      }
    })();

    return () => { mounted = false; };
  }, [uri]);

  if (!src) {
    return (
      <View style={[style, styles.thumbPlaceholder]}>
        <Text style={styles.thumbPlaceholderText}>กำลังโหลด...</Text>
      </View>
    );
  }

  return <Image source={{ uri: src }} style={style} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fff' },
  header: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  backBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  backText: { color: '#333', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    padding: 10,
    marginVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#f5f5f5', marginRight: 12, overflow: 'hidden' },
  thumbPlaceholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  thumbPlaceholderText: { color: '#999', fontSize: 12 },
  meta: { flex: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontWeight: '700', marginBottom: 4, fontSize: 14 },
  date: { color: '#666', fontSize: 12, marginLeft: 8 },
  count: { color: '#666', marginTop: 6, marginBottom: 6 },
  emptyCard: { padding: 20, borderRadius: 8, backgroundColor: '#fafafa', alignItems: 'center', marginTop: 12 },
  emptyText: { color: '#666' },
  location: { color: '#444', fontSize: 13 },
  coords: { color: '#666', fontSize: 12 },
  desc: { marginTop: 6, color: '#333', fontSize: 13 },
  reporter: { marginTop: 6, color: '#777', fontSize: 12 }
});

