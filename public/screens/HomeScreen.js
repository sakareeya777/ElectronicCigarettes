import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, Linking, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import Search from '../components/Search';
import HamburgerMenu from '../components/HamburgerMenu';

const screenWidth = Dimensions.get('window').width;

// ตัวอย่างลิ้งข่าวที่คุณสามารถแก้ไขหรือเพิ่มเองได้
const newsLinks = [
  {
    title: 'ผลกระทบของบุหรี่ไฟฟ้าต่อสุขภาพ',
    description: 'อ่านรายละเอียดเกี่ยวกับผลกระทบของบุหรี่ไฟฟ้าต่อสุขภาพ',
    url: 'https://www.youtube.com/watch?v=WQORddI6NuA&themeRefresh=1',
  },
  {
    title: 'กฎหมายเกี่ยวกับบุหรี่ไฟฟ้าในประเทศไทย',
    description: 'อัปเดตกฎหมายล่าสุดเกี่ยวกับบุหรี่ไฟฟ้า',
    url: 'https://www.youtube.com/watch?v=koxI97ol_yk',
  },
  {
    title: 'งานวิจัยใหม่เกี่ยวกับบุหรี่ไฟฟ้า',
    description: 'สรุปงานวิจัยล่าสุดเกี่ยวกับบุหรี่ไฟฟ้า',
    url: 'https://www.youtube.com/watch?v=q6IUGzTSw2M',
  },
  {
    title: 'การรณรงค์เพื่อสุขภาพ',
    description: 'กิจกรรมและโครงการส่งเสริมสุขภาพในชุมชน',
    url: 'https://www.youtube.com/watch?v=q6IUGzTSw2M',
  },
  {
    title: 'วิธีเลิกบุหรี่ไฟฟ้า',
    description: 'แนวทางการเลิกบุหรี่ไฟฟ้าอย่างปลอดภัย',
    url: 'https://www.youtube.com/watch?v=koxI97ol_yk',
  },
];

const bannerImages = [
  // ใช้ thumbnail ของ youtube เป็นตัวอย่าง banner
  'https://img.youtube.com/vi/WQORddI6NuA/hqdefault.jpg',
  'https://img.youtube.com/vi/koxI97ol_yk/hqdefault.jpg',
  'https://img.youtube.com/vi/q6IUGzTSw2M/hqdefault.jpg',
];

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

export default function HomeScreen() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noRelated, setNoRelated] = useState(false);

  const NEWS_ENDPOINT = process.env.NEWS_ENDPOINT || 'https://electroniccigarettes.onrender.com/';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(NEWS_ENDPOINT);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Expecting { items: [ { title, link, pubDate, contentSnippet, thumbnail } ] }
        if (mounted && data && Array.isArray(data.items)) {
          // Compute backend origin to use thumbnail proxy (so images are same-origin and bypass CORS/blocked remote hosts)
          let backendOrigin = null;
          try {
            backendOrigin = new URL(NEWS_ENDPOINT).origin;
          } catch (e) {
            // fallback: strip path
            backendOrigin = NEWS_ENDPOINT.replace(/\/news.*$/,'') || NEWS_ENDPOINT;
          }

          const mapped = data.items.map(i => {
            // Use a robust extractor that looks into enclosure, media, HTML content, etc.
            let thumb = extractThumbnail(i);

            try {
              if (thumb) {
                const u = new URL(thumb);
                const host = u.hostname || '';
                const problematicHosts = ['thaihealth.or.th'];
                if (problematicHosts.includes(host)) {
                  // compute backend origin (same logic as above)
                  const backendOrigin = (() => {
                    try { return new URL(NEWS_ENDPOINT).origin; } catch (e) { return NEWS_ENDPOINT.replace(/\/news.*$/, '') || NEWS_ENDPOINT; }
                  })();
                  thumb = `${backendOrigin}/thumb?url=${encodeURIComponent(thumb)}`;
                }
              }
            } catch (e) {
              // ignore URL parsing errors and keep original thumb
            }

            return { title: i.title, url: i.link || i.url || '#', thumbnail: thumb };
          });
          if (mapped.length === 0) {
            console.warn('Feed returned 0 items, using local sample news as fallback');
            const fallback = newsLinks.map(n => ({ title: n.title, url: n.url, thumbnail: getYoutubeThumbnail(n.url) }));
            setNoRelated(false);
            setNews(fallback);
          } else {
            setNoRelated(false);
            setNews(mapped);
          }
        }
      } catch (e) {
        console.warn('Failed to load news from endpoint, using fallback', e.message);
        setError(e.message);
        try {
          const fallback = newsLinks.map(n => ({
            title: n.title,
            url: n.url,
            thumbnail: getYoutubeThumbnail(n.url)
          }));
          if (mounted) {
            setNews(fallback);
            setNoRelated(false);
          }
        } catch (err2) {
          // ignore fallback errors
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    // Try fetching, but don't overwrite if it fails (keep local sample)
    load();
    return () => { mounted = false; };
  }, [NEWS_ENDPOINT]);

  // Banner images: prefer thumbnails from fetched news, fallback to static list
  const bannerSources = (news || []).slice(0, 3).map(n => n.thumbnail).filter(t => isValidThumb(t));
  const banners = bannerSources.length ? bannerSources : bannerImages;

  // render card
  const renderItem = ({ item }) => {
    // normalize thumbnail: accept only valid http(s) urls, otherwise try youtube thumb
    const raw = item && item.thumbnail ? String(item.thumbnail) : '';
    const thumbUri = isValidThumb(raw) ? raw : (getYoutubeThumbnail(item && item.url ? item.url : '') || null);
    return (
      <TouchableOpacity style={styles.smallCard} onPress={() => Linking.openURL(item.url)}>
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={styles.smallThumb} />
        ) : (
          // fallback to bundled local image so the card never appears blank
          <Image source={require('../assets/sabanoor.jpg')} style={styles.smallThumb} />
        )}
        <Text style={styles.smallTitle} numberOfLines={2}>{item.title}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topArea}>
        <Text style={styles.header}>ข่าวสาร</Text>
        <HamburgerMenu />
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

      {/* Categories row */}
      <View style={styles.categoriesRow}>
        <TouchableOpacity style={styles.categoryBtn}>
          <Text style={styles.categoryIcon}>🎮</Text>
          <Text style={styles.categoryText}>เกม</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.categoryBtn}>
          <Text style={styles.categoryIcon}>🟡</Text>
          <Text style={styles.categoryText}>คะแนน</Text>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDEEF2' },
  topArea: { marginTop: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { fontSize: 18, fontWeight: '700' },
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
});