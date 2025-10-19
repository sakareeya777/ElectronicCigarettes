import { View, Text, FlatList, StyleSheet, Dimensions, Linking, TouchableOpacity, Image } from 'react-native';
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
];

const getYoutubeThumbnail = (url) => {
  // ดึงรหัสวิดีโอจาก url
  const match = url.match(/(?:v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/);
  return match
    ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    : null;
};

export default function HomeScreen() {
  // ฟังก์ชันสำหรับแสดงแต่ละลิ้งข่าว
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* แสดง thumbnail ของ YouTube */}
      {getYoutubeThumbnail(item.url) && (
        <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
          <Image
            source={{ uri: getYoutubeThumbnail(item.url) }}
            style={styles.thumbnail}
          />
        </TouchableOpacity>
      )}
      <View style={styles.textBox}>
        <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
          <Text style={[styles.title, { color: '#007AFF' }]}>
            {item.title}
          </Text>
        </TouchableOpacity>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
          <Text style={{ color: '#007AFF', fontSize: 13 }}>
            ดูคลิปข่าวบน YouTube
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { marginTop: 20 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Welcome Wanita Sihat Pattani</Text>
        <HamburgerMenu />
      </View>
      <Search />
      <FlatList
        data={newsLinks}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 20, fontWeight: 'bold' }, 
  card: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 16, 
    overflow: 'hidden', elevation: 3, shadowColor: '#000', 
    shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, 
    shadowRadius: 3 },
  textBox: { padding: 12 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  description: { fontSize: 14, color: '#555' },
  thumbnail: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#eee',
  },
});