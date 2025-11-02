import { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { addPhoto, getLastPhoto } from '../utils/storage';

// Component หลักสำหรับแสดงกล้องถ่ายรูป
export default function CameraViewScreen({ onPhotoSaved, onOpenGallery }) {
  const camRef = useRef(null); // อ้างอิงกล้อง
  const [permission, requestPermission] = useCameraPermissions(); // จัดการสิทธิ์กล้อง
  const [ready, setReady] = useState(false); // สถานะกล้องพร้อมใช้งาน
  const [facing, setFacing] = useState('back'); // กล้องหน้า/หลัง
  const [thumb, setThumb]   = useState(null);   // รูปถ่ายล่าสุด (thumbnail)

  // ขอสิทธิ์กล้องและโหลดรูปถ่ายล่าสุดเมื่อ mount
  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
      const last = await getLastPhoto();
      if (last) setThumb(last);
    })();
  }, [permission]);

  // ถ้ายังไม่ได้รับ permission ใด ๆ
  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  // ถ้ายังไม่ได้รับอนุญาตให้ใช้กล้อง
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#fff', marginBottom: 8 }}>
          ต้องการสิทธิ์การใช้กล้อง
        </Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnPrimaryText}>อนุญาต</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ฟังก์ชันสลับกล้องหน้า/หลัง
  const toggleFacing = () => setFacing((f) => (f === 'back' ? 'front' : 'back'));

  // ฟังก์ชันถ่ายรูปและบันทึกไฟล์
  const takePicture = async () => {
    try {
      if (!camRef.current || !ready) return;
      const shot = await camRef.current.takePictureAsync();
      const filename = `photo_${Date.now()}.jpg`;

      if (Platform.OS === 'web') {
        Alert.alert('ไม่รองรับ', 'ฟีเจอร์นี้ใช้ได้เฉพาะบนมือถือ');
        return;
      }

      const dest = FileSystem.documentDirectory + filename;
      await FileSystem.copyAsync({ from: shot.uri, to: dest });
      await addPhoto(dest);
      setThumb(dest);
      onPhotoSaved?.(dest);
      Alert.alert('สำเร็จ', 'บันทึกรูปไว้ในเครื่องแล้ว');
    } catch (e) {
      console.error(e);
      Alert.alert('ผิดพลาด', 'ถ่ายหรือบันทึกรูปไม่สำเร็จ');
    }
  };

  return (
    <View style={styles.root}>
      {/* กล้องแสดงผลเต็มจอ */}
      <CameraView
        ref={camRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={() => setReady(true)}
      >
        {/* เส้นมุมโฟกัส 4 มุม */}
        <View style={styles.focusWrap}>
          <Corner style={[styles.corner, styles.topLeft]} />
          <Corner style={[styles.corner, styles.topRight]} />
          <Corner style={[styles.corner, styles.bottomLeft]} />
          <Corner style={[styles.corner, styles.bottomRight]} />
        </View>
      </CameraView>

      {/* แถบปุ่มด้านล่าง */}
      <View style={styles.bottomBar}>
        {/* ปุ่มรูปย่อ (เปิดแกลเลอรี่) */}
        <TouchableOpacity
          style={styles.thumbWrap}
          onPress={onOpenGallery}
          activeOpacity={0.7}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Text style={{ color: '#999' }}>—</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ปุ่มชัตเตอร์ */}
        <TouchableOpacity style={styles.shutterOuter} onPress={takePicture} activeOpacity={0.8}>
          <View style={styles.shutterInner}>
            {/* วงกลมชัตเตอร์ */}
          </View>
        </TouchableOpacity>

        {/* ปุ่มสลับกล้อง */}
        <TouchableOpacity style={styles.roundBtn} onPress={toggleFacing}>
          <Text style={{ color: '#fff', fontSize: 18 }}>🔄</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** เส้นมุมโฟกัส (ใช้ตกแต่ง UI) */
function Corner({ style }) {
  return <View style={style} />;
}

const SIZE = 74;

// สไตล์ทั้งหมดของ component
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },

  camera: { flex: 1 },

  focusWrap: {
    flex: 1,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#fff',
  },
  topLeft:     { top: 50, left: 24, borderTopWidth: 3, borderLeftWidth: 3, borderRadius: 4 },
  topRight:    { top: 50, right: 24, borderTopWidth: 3, borderRightWidth: 3, borderRadius: 4 },
  bottomLeft:  { bottom: 150, left: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderRadius: 4 },
  bottomRight: { bottom: 150, right: 24, borderBottomWidth: 3, borderRightWidth: 3, borderRadius: 4 },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  thumbWrap: { width: SIZE, height: SIZE, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' },
  thumb:     { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  shutterOuter: {
    width: SIZE + 14,
    height: SIZE + 14,
    borderRadius: (SIZE + 14) / 2,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterIcon: { color: '#000', fontSize: 18, fontWeight: '700' },

  roundBtn: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  // ปุ่มอนุญาต
  btnPrimary: { backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
});