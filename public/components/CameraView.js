import { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { addPhoto, getLastPhoto } from '../utils/storage';

export default function CameraViewScreen({ onPhotoSaved, onOpenGallery }) {
  const camRef = useRef(null);
  const videoRef = useRef(null); // สำหรับ Web
  const canvasRef = useRef(null); // สำหรับ Web

  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState('back');
  const [thumb, setThumb] = useState(null);

  //-------------------------------------------------------------------
  // โหลดกล้อง Web (video tag)
  //-------------------------------------------------------------------
  useEffect(() => {
    if (Platform.OS === 'web') {
      initWebCam();
    }
  }, []);

  const initWebCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing === 'back' ? 'environment' : 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      alert("ไม่สามารถเปิดกล้องบนเว็บได้: " + e.message);
    }
  };

  //-------------------------------------------------------------------
  // โหลดรูปล่าสุด
  //-------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web" && !permission?.granted) {
        await requestPermission();
      }
      const last = await getLastPhoto();
      if (last) setThumb(last);
    })();
  }, [permission]);

  //-------------------------------------------------------------------
  // ถ้า Mobile แต่ยังไม่ได้รับสิทธิ์กล้อง
  //-------------------------------------------------------------------
  if (Platform.OS !== "web") {
    if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

    if (!permission.granted) {
      return (
        <View style={styles.center}>
          <Text style={{ color: '#fff', marginBottom: 8 }}>ต้องการสิทธิ์การใช้กล้อง</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
            <Text style={styles.btnPrimaryText}>อนุญาต</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  //-------------------------------------------------------------------
  // สลับกล้อง (mobile + web)
  //-------------------------------------------------------------------
  const toggleFacing = () => {
    setFacing((f) => (f === 'back' ? 'front' : 'back'));

    if (Platform.OS === "web") {
      initWebCam(); // reload video stream
    }
  };

  //-------------------------------------------------------------------
  // ถ่ายรูปบน iOS / Android
  //-------------------------------------------------------------------
  const takePictureMobile = async () => {
    try {
      if (!camRef.current || !ready) return;

      const shot = await camRef.current.takePhoto({
        quality: 1,
        skipProcessing: false
      });

      const filename = `photo_${Date.now()}.jpg`;
      const dest = FileSystem.documentDirectory + filename;

      await FileSystem.copyAsync({ from: shot.uri, to: dest });
      await addPhoto(dest);

      setThumb(dest);
      onPhotoSaved?.(dest);

      Alert.alert("สำเร็จ", "บันทึกรูปลงเครื่องแล้ว (Mobile)");
    } catch (e) {
      console.error(e);
      Alert.alert("ผิดพลาด", "ถ่ายรูปไม่สำเร็จ");
    }
  };

  //-------------------------------------------------------------------
  // ถ่ายรูปบน Web + บันทึกลงเครื่องอัตโนมัติ
  //-------------------------------------------------------------------
  const takePictureWeb = () => {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // กำหนดขนาดตามกล้องจริง
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // capture frame
      ctx.drawImage(video, 0, 0);

      // ได้ base64
      const dataURL = canvas.toDataURL("image/jpeg", 1.0);
      setThumb(dataURL);
      onPhotoSaved?.(dataURL);

      //----------------------------------------------------------------
      // ⭐ บันทึกรูปลงเครื่อง (ไฟล์จริง) ⭐
      //----------------------------------------------------------------
      fetch(dataURL)
        .then(res => res.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");

          a.href = url;
          a.download = `photo_${Date.now()}.jpg`; // ชื่อไฟล์
          document.body.appendChild(a);
          a.click();
          a.remove();

          window.URL.revokeObjectURL(url);
        });

      alert("บันทึกรูปลงเครื่องแล้ว (Web)");

    } catch (e) {
      alert("ถ่ายรูปบนเว็บล้มเหลว: " + e.message);
    }
  };

  //-------------------------------------------------------------------
  // ตัวเลือกแพลตฟอร์ม
  //-------------------------------------------------------------------
  const takePicture = () => {
    if (Platform.OS === "web") takePictureWeb();
    else takePictureMobile();
  };

  return (
    <View style={styles.root}>

      {/* MOBILE CAMERA */}
      {Platform.OS !== "web" ? (
        <CameraView
          ref={camRef}
          style={styles.camera}
          facing={facing}
          onCameraReady={() => setReady(true)}
        />
      ) : (
        // WEB CAMERA
        <View style={styles.webCamContainer}>
          <video ref={videoRef} autoPlay playsInline style={styles.webVideo} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </View>
      )}

      {/* UI ด้านล่าง */}
      <View style={styles.bottomBar}>
        {/* รูปย่อ */}
        <TouchableOpacity style={styles.thumbWrap} onPress={onOpenGallery}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Text style={{ color: '#999' }}>—</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ปุ่มชัตเตอร์ */}
        <TouchableOpacity style={styles.shutterOuter} onPress={takePicture}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        {/* ปุ่มสลับกล้อง */}
        <TouchableOpacity style={styles.roundBtn} onPress={toggleFacing}>
          <Text style={{ color: '#fff', fontSize: 20 }}>🔄</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const SIZE = 74;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  camera: { flex: 1 },

  webCamContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center"
  },

  webVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  thumbWrap: { width: SIZE, height: SIZE, borderRadius: 12, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
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
  },

  roundBtn: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000'
  },

  btnPrimary: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10
  },

  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700'
  }
});
