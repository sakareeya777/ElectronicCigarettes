import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, Linking, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Search from '../components/Search';
import HamburgerMenu from '../components/HamburgerMenu';
import { useUserAuth } from '../context/UserAuthContext';
import { ref, onValue, database, set, get } from '../firebase/firebaseConfig';

const screenWidth = Dimensions.get('window').width;

const getYoutubeThumbnail = (url) => {
  // ดึงรหัสวิดีโอจาก url
  const match = url.match(/(?:v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/);
  return match
    ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    : null;
};

// consider a thumbnail valid only if it's a non-empty string and looks like an http(s) url
const isValidThumb = (t) => typeof t === 'string' && t.trim() !== '' && t.trim().toLowerCase() !== 'null' && /^(https?:)?\/\//i.test(t);

// Normalize thumbnail url: expand protocol-relative URLs (//host/path) to https:
const normalizeThumb = (t) => {
  if (!t || typeof t !== 'string') return null;
  const s = t.trim();
  if (s.startsWith('//')) return `https:${s}`;
  return s;
};

// Robustly extract a thumbnail URL from various feed item fields
const extractThumbnail = (item) => {
  if (!item || typeof item !== 'object') return null;

  // 1) common direct fields
  const cand = item.thumbnail || item.image || item.thumb || null;
  if (cand && isValidThumb(cand)) return normalizeThumb(cand);

  // 2) enclosure or enclosures (RSS feeds often put media in enclosure)
  if (item.enclosure && (item.enclosure.url || item.enclosure['_url'])) return normalizeThumb(item.enclosure.url || item.enclosure['_url']);
  if (Array.isArray(item.enclosures) && item.enclosures.length) {
    const e0 = item.enclosures[0];
    if (e0 && (e0.url || e0._url)) return normalizeThumb(e0.url || e0._url);
  }

  // 3) media:content / media:thumbnail
  if (item.media) {
    // media.content may be array
    if (item.media.content) {
      const m = Array.isArray(item.media.content) ? item.media.content[0] : item.media.content;
      if (m && (m.url || m._url)) return normalizeThumb(m.url || m._url);
    }
    if (item.media.thumbnail && (item.media.thumbnail.url || item.media.thumbnail._url)) return normalizeThumb(item.media.thumbnail.url || item.media.thumbnail._url);
  }
  if (item['media:thumbnail'] && (item['media:thumbnail'].url || item['media:thumbnail']['@url'])) return normalizeThumb(item['media:thumbnail'].url || item['media:thumbnail']['@url']);

  // 4) try to extract from HTML content fields
  const html = item.content || item['content:encoded'] || item.contentSnippet || item.summary || '';
  if (html && typeof html === 'string') {
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m && m[1]) return normalizeThumb(m[1]);
  }

  // 5) youtube fallback from link
  const link = item.link || item.url || '';
  const yt = getYoutubeThumbnail(link);
  if (yt) return yt;

  return null;
};

export default function HomeScreen({ navigation }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noRelated, setNoRelated] = useState(false);
  const { user } = useUserAuth() || {};

  useEffect(() => {
    // intentionally no verbose auth logging in production
  }, [user]);

  // Quick add form state (visible only to logged-in users)
  const [qaTitle, setQaTitle] = useState('');
  const [qaUrl, setQaUrl] = useState('');
  const [qaThumb, setQaThumb] = useState('');
  const [qaDescription, setQaDescription] = useState('');
  const [qaLoading, setQaLoading] = useState(false);

  // Use Realtime Database subscription to load news (initial load + updates)

  useEffect(() => {
    setLoading(true);
    const newsRef = ref(database, 'news');
    const unsubscribe = onValue(newsRef, (snapshot) => {
      const data = snapshot.val();
      const newsList = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      // If DB returns empty array, keep it empty (do not inject sample data here).
      setNews(newsList);
      setLoading(false);
    }, (err) => {
      console.error('RTDB onValue error', err);
      // store error so UI can react (for example show a message or prompt to login)
      setError(err && err.message);
      // Don't automatically replace with sample news on permission errors.
      // Instead leave `news` as-is (likely empty) and let the UI show a helpful message.
      setLoading(false);
    });

    return () => unsubscribe(); // cleanup subscription
  }, []);

  const submitQuickAdd = async () => {
    if (!user) { Alert.alert('Unauthorized', 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'); navigation && navigation.navigate && navigation.navigate('Login'); return; }
    if (!qaTitle.trim()) { Alert.alert('กรุณากรอกหัวข้อข่าว'); return; }
    setQaLoading(true);
      try {
      // do not log user tokens or IDs here (sensitive)
      try {
        if (user && typeof user.getIdTokenResult === 'function') {
          await user.getIdTokenResult();
        }
      } catch (tokenErr) {
        console.warn('[HomeScreen] could not getIdTokenResult');
      }
      // write to Realtime Database under `news/{timestamp}`
      const key = Date.now();
      await set(ref(database, `news/${key}`), {
        title: qaTitle.trim(),
        description: qaDescription.trim() || null,
        url: qaUrl.trim() || null,
        thumbnail: qaThumb.trim() || null,
        createdAt: new Date().toISOString(),
      });
      Alert.alert('บันทึกสำเร็จ', 'เพิ่มข่าวเรียบร้อย');
      // optimistic update: prepend to local list
      setNews(prev => [{ id: String(key), title: qaTitle.trim(), description: qaDescription.trim() || null, url: qaUrl.trim() || '#', thumbnail: qaThumb.trim() || null }, ...prev]);
      setQaTitle(''); setQaUrl(''); setQaThumb('');
      setQaDescription('');
    } catch (e) {
      // more detailed logging for debugging permissions
      try {
        console.error('Quick add failed', {
          name: e && e.name,
          code: e && e.code,
          message: e && e.message,
          stack: e && e.stack,
        });
      } catch (logErr) {
        console.error('Quick add failed (could not stringify)', e);
      }
      Alert.alert('ผิดพลาด', 'ไม่สามารถเพิ่มข่าวได้');
    } finally {
      setQaLoading(false);
    }
  };

  // Banner images: prefer thumbnails from fetched news. If none, render empty list.
  const bannerSources = (news || []).slice(0, 3).map(n => n.thumbnail).filter(t => isValidThumb(t));
  const banners = bannerSources;

  // Small helper image component that will attempt a proxy URL on error
  function RemoteImage({ uri, style }) {
    const [src, setSrc] = useState(uri || null);
    const [triedProxy, setTriedProxy] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      setSrc(uri || null);
        setFailed(false);
    }, [uri]);

    const onError = () => {
      setFailed(true);
    };

    if (!src || failed) {
      // show a neutral placeholder view instead of local sabanoor image
      return <View style={[style, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]} />;
    }

    return <Image source={{ uri: src }} style={style} onError={onError} />;
  }

  // render card
  const renderItem = ({ item }) => {
    // normalize thumbnail: accept only valid http(s) urls, otherwise try youtube thumb
    const raw = item && item.thumbnail ? String(item.thumbnail) : '';
    const thumbUri = isValidThumb(raw) ? raw : (getYoutubeThumbnail(item && item.url ? item.url : '') || null);
    return (
      <TouchableOpacity style={styles.smallCard} onPress={() => Linking.openURL(item.url)}>
        {
          // use RemoteImage which will try proxying on error and otherwise show neutral placeholder
        }
        <RemoteImage uri={thumbUri} style={styles.smallThumb} />
        <Text style={styles.smallTitle} numberOfLines={2}>{item.title}</Text>
        {item.description ? <Text style={styles.smallDesc} numberOfLines={2}>{item.description}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topArea}>
        <Text style={styles.header}>ข่าวสาร</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AuthAdminButton navigation={navigation} />
          <View style={{ width: 8 }} />
          <HamburgerMenu />
        </View>
      </View>

      {/* Banner horizontal */}
      <View style={styles.bannerWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{}}>
          {banners.map((uri, i) => (
            <TouchableOpacity key={i} onPress={() => { /* อาจเปิดลิงก์จริง */ }} activeOpacity={0.8}>
              <Image source={{ uri }} style={styles.bannerImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search - keep existing component but wrap for spacing */}
      <View style={styles.searchWrap}>
        <Search />
      </View>

      {loading ? (
        <View style={{padding:20}}>
          <ActivityIndicator size="large" color="#229954" />
        </View>
      ) : noRelated ? (
        <View style={{padding:20, alignItems:'center'}}>
          <Text style={{marginBottom:10}}>ยังไม่มีข่าวที่เกี่ยวข้องกับบุหรี่ไฟฟ้า</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.thaihealth.or.th/category/%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%AA%E0%B8%B8%E0%B8%82/%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7%E0%B8%AA%E0%B8%B8%E0%B8%82%E0%B8%A0%E0%B8%B2%E0%B8%9E/')} style={{backgroundColor:'#229954', paddingHorizontal:16, paddingVertical:10, borderRadius:8}}>
            <Text style={{color:'#fff'}}>เปิด feed ที่มาทั้งหมด</Text>
          </TouchableOpacity>
          <View style={{height:10}} />
          <TouchableOpacity onPress={() => Linking.openURL('https://news.google.com/search?q=%E0%B8%9A%E0%B8%B8%E0%B8%AB%E0%B8%A3%E0%B9%88%E0%B8%B2%E0%B8%84%E0%B8%B7%E0%B8%9A%E0%B9%84%E0%B8%9F%E0%B8%B2&hl=th&gl=TH&ceid=TH:th')} style={{backgroundColor:'#1e88e5', paddingHorizontal:16, paddingVertical:10, borderRadius:8}}>
            <Text style={{color:'#fff'}}>ค้นหาข่าวเกี่ยวกับบุหรี่ไฟฟ้า (Google News)</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 12 }}
        />
      )}

    </View>
  );
}

function AuthAdminButton({ navigation }) {
  const { user } = useUserAuth() || {};
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (!user) {
        if (mounted) setIsAdmin(false);
        return;
      }
        try {
          // Quick admin check via Realtime Database: admins/{uid} = true
          if (mounted) setIsCheckingAdmin(true);
          const adminRef = ref(database, `admins/${user.uid}`);
          const snap = await get(adminRef);
          const ok = snap && snap.exists() && !!snap.val();
          if (mounted) setIsAdmin(!!ok);
        } catch (e) {
          console.warn('[AuthAdminButton] could not read admin flag from RTDB', e);
          if (mounted) setIsAdmin(false);
        } finally {
          if (mounted) setIsCheckingAdmin(false);
        }
    };
    check();
    return () => { mounted = false; };
  }, [user]);

  // If not logged in, render nothing
  if (!user) return null;

  // While checking admin flag, don't render any admin/account button to avoid flicker
  if (isCheckingAdmin) return null;

  if (isAdmin) {
    return (
      <TouchableOpacity onPress={() => navigation && navigation.navigate && navigation.navigate('AdminManageNews')} style={styles.adminBtn}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Admin</Text>
      </TouchableOpacity>
    );
  }

  // Logged-in but not admin -> do not render admin/account button
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDEEF2' },
  topArea: { marginTop: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { fontSize: 18, fontWeight: '700' },
  adminBtn: { backgroundColor: '#ff5a5f', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  bannerWrap: { marginTop: 12, paddingLeft: 12 },
  bannerImage: { width: screenWidth - 64, height: 140, borderRadius: 12, marginRight: 12, backgroundColor: '#eee' },
  searchWrap: { paddingHorizontal: 16, marginTop: 14 },
  categoriesRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8C7D0', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, minWidth: (screenWidth - 56) / 2, justifyContent: 'center' },
  categoryIcon: { fontSize: 20, marginRight: 8 },
  categoryText: { fontSize: 16, fontWeight: '600' },
  columnWrapper: { justifyContent: 'space-between', marginTop: 12 },
  smallCard: { backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', width: (screenWidth - 40) / 2, marginBottom: 12, elevation: 2, paddingBottom: 8 },
  smallThumb: { width: '100%', height: 100, backgroundColor: '#eee' },
  smallTitle: { paddingHorizontal: 8, paddingTop: 8, fontSize: 13, color: '#333', fontWeight: '600' },
  smallDesc: { paddingHorizontal: 8, paddingTop: 4, fontSize: 12, color: '#666' },
});