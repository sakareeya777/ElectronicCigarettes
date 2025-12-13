import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Modal, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MdReport, MdAddAPhoto } from 'react-icons/md';
import { database, ref, set, storage } from '../firebase/firebaseConfig';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function FormScreen() {
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [image, setImage] = useState(null);
  const [coords, setCoords] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUri, setMediaUri] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video'
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submissionMode, setSubmissionMode] = useState('anonymous'); // 'anonymous' | 'identified'
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState(''); // phone or email if identified
  const [submitting, setSubmitting] = useState(false);

  const NEWS_ENDPOINT = process.env.NEWS_ENDPOINT || 'https://electroniccigarettes.onrender.com/news/thaihealth';

  const getBackendOrigin = () => {
    // If running in the browser on localhost, prefer the local backend (development convenience).
    try {
      if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return 'http://localhost:3001';
        }
      }
    } catch (e) {
      // ignore
    }

    // prefer explicit NEWS_ENDPOINT if it's a full URL
    try {
      const u = new URL(NEWS_ENDPOINT);
      return u.origin;
    } catch (e) {
      // Not an absolute URL
      if (typeof window !== 'undefined' && window.location) {
        // if NEWS_ENDPOINT is a path like '/news/thaihealth', use same origin
        if (NEWS_ENDPOINT && NEWS_ENDPOINT.startsWith('/')) {
          return window.location.origin;
        }
      }
      // Last resort: strip '/news...' from configured endpoint or use production origin
      try {
        const maybe = NEWS_ENDPOINT.replace(/\/news.*$/,'');
        if (maybe) return maybe;
      } catch (e2) {
        // ignore
      }
      return 'https://electroniccigarettes.onrender.com';
    }
  };
  const BACKEND_ORIGIN = getBackendOrigin();

  const TYPE_OPTIONS = [
    'ขาย',
    'แจก',
    'โฆษณา',
    'สื่อออนไลน์',
    'ร้านค้า',
    'การจัดส่ง',
  ];

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const uri = asset.uri;
      // asset.type or asset.mediaType may contain 'image' or 'video' depending on platform
      const atype = asset.type || asset.mediaType || (uri && (uri.match(/\.mp4|\.mov|\.webm/i) ? 'video' : 'image'));
      setMediaUri(uri);
      setMediaType(atype && atype.toString().startsWith('video') ? 'video' : 'image');
      // keep backward-compatible `image` state for other code
      setImage(atype && atype.toString().startsWith('video') ? null : uri);
    }
  };

  // Try to require DateTimePicker for native platforms (won't be used on web)
  let DateTimePicker = null;
  if (Platform.OS !== 'web') {
    try {
  // require at runtime so web bundlers won't fail if package is not present
  DateTimePicker = require('@react-native-datetimepicker/datetimepicker').default;
    } catch (e) {
      DateTimePicker = null;
    }
  }

  const handleSubmit = () => {
    // เบื้องต้น: ตรวจสอบค่าที่จำเป็น
    if (!type) {
      alert('กรุณาเลือกประเภท');
      return;
    }
    if (!date) {
      alert('กรุณาเลือกวันที่');
      return;
    }
    if (!time) {
      alert('กรุณาเลือกเวลา');
      return;
    }
    if (!description) {
      alert('กรุณากรอกคำบรรยายสั้น');
      return;
    }
    if (submissionMode === 'identified' && !reporterContact) {
      alert('กรุณากรอกข้อมูลติดต่อหากต้องการรับคำตอบ/รางวัล');
      return;
    }

    // Send payload to backend POST /reports
    const submit = async () => {
      // payload as-fallback (uses original mediaUri when upload not yet attempted)
      const payload = {
        type,
        date,
        time,
        location,
        coords,
        description,
        media: mediaUri ? { uri: mediaUri, mediaType } : null,
        anonymous: submissionMode === 'anonymous',
        reporter: submissionMode === 'identified' ? { name: reporterName || null, contact: reporterContact } : null,
      };
      try {
        setSubmitting(true);
        // Write directly to Realtime Database so frontend does not require backend server to be running
        const key = Date.now();

        // If mediaUri exists, either upload to Firebase Storage (if explicitly enabled),
        // or convert to a data URL (base64) and store directly in Realtime Database.
        // Storing as data URL avoids using Google Cloud Storage and CORS issues.
        let mediaObj = null;
        const USE_FIREBASE_STORAGE = (typeof process !== 'undefined' && process.env && process.env.USE_FIREBASE_STORAGE === 'true');
        if (mediaUri) {
          try {
            // If it's already a remote URL, keep as-is
            if (mediaUri.startsWith && (mediaUri.startsWith('http://') || mediaUri.startsWith('https://'))) {
              mediaObj = { uri: mediaUri, mediaType };
            } else if (USE_FIREBASE_STORAGE && storage) {
              // Upload to Firebase Storage only when explicitly enabled
              const resp = await fetch(mediaUri);
              const blob = await resp.blob();
              const storagePath = `reports/${key}/media_${Date.now()}`;
              const storageReference = sRef(storage, storagePath);
              await uploadBytes(storageReference, blob);
              const downloadURL = await getDownloadURL(storageReference);
              mediaObj = { uri: downloadURL, mediaType };
            } else {
              // Convert blob/local URI to data URL (base64) and store inline in RTDB
              const resp = await fetch(mediaUri);
              const blob = await resp.blob();
              // read blob as data URL
              const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => { reader.abort(); reject(new Error('Failed to read blob as dataURL')); };
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              mediaObj = { uri: dataUrl, mediaType };
            }
          } catch (uploadErr) {
            console.warn('Media processing failed, continuing without media', uploadErr);
            mediaObj = null;
          }
        }

        const rec = Object.assign({}, {
          type,
          date,
          time,
          location,
          coords,
          description,
          media: mediaObj,
          anonymous: submissionMode === 'anonymous',
          reporter: submissionMode === 'identified' ? { name: reporterName || null, contact: reporterContact } : null,
        }, { created_at: new Date().toISOString() });

        await set(ref(database, `reports/${key}`), rec);
        console.log('Saved report to Realtime DB at reports/%s payload=', key, rec);
        alert('ส่งรายงานเรียบร้อย! ข้อมูลถูกบันทึกแบบเรียลไทม์');
      } catch (e) {
        console.error('Submit to RTDB failed', e);
        // If RTDB write fails, optionally attempt backend POST as a fallback
        try {
          const url = `${BACKEND_ORIGIN}/reports`;
          console.log('Falling back to POST', url, 'payload=', payload);
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Server error: ${res.status} ${text} (POST ${url})`);
          }
          const data = await res.json();
          console.log('Server response (fallback):', data);
          alert('ส่งรายงานเรียบร้อย (ผ่าน backend fallback)');
        } catch (e2) {
          console.error('Fallback POST failed', e2);
          alert('ส่งรายงานไม่สำเร็จ: ' + (e2.message || e2));
        }
      } finally {
        setSubmitting(false);
      }
    };
    submit();

    // รีเซ็ตฟอร์ม
    // reset non-blocking (we keep after attempt)
    setLocation('');
    setType('');
    setImage(null);
    setMediaUri(null);
    setMediaType(null);
    setCoords('');
    setDescription('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        <MdReport size={28} color="#229954" /> รายงานแหล่งจำหน่าย/แหล่งมั่วสุม
      </Text>
  <ScrollView style={styles.formBox} contentContainerStyle={styles.formContent}>
        <Text style={styles.label}>วันเวลา</Text>
        <TouchableOpacity style={styles.dateRow} onPress={() => setDateModalVisible(true)}>
          <Text style={styles.dateText}>{date || 'เลือกวันที่'}{time ? ` ${time}` : ''}</Text>
        </TouchableOpacity>
        <Modal visible={dateModalVisible} transparent animationType="slide" onRequestClose={() => setDateModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={{fontSize:16, fontWeight:'bold', marginBottom:8}}>เลือกวันและเวลา</Text>
              {Platform.OS === 'web' ? (
                <>
                  <div style={{display:'flex', flexDirection:'column'}}>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={{padding:10, fontSize:16, marginBottom:8, borderRadius:8, border:'1px solid #229954'}}
                    />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      style={{padding:10, fontSize:16, marginBottom:8, borderRadius:8, border:'1px solid #229954'}}
                    />
                  </div>
                </>
              ) : (
                <>
                  <TouchableOpacity style={[styles.input, {marginBottom:8, justifyContent:'center'}]} onPress={() => setShowDatePicker(true)}>
                    <Text>{date || 'เลือกวันที่'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.input, {marginBottom:8, justifyContent:'center'}]} onPress={() => setShowTimePicker(true)}>
                    <Text>{time || 'เลือกเวลา'}</Text>
                  </TouchableOpacity>
                  {showDatePicker && DateTimePicker && (
                    <DateTimePicker
                      value={date ? new Date(date) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selected) => {
                        setShowDatePicker(false);
                        if (selected) {
                          const y = selected.getFullYear();
                          const m = String(selected.getMonth() + 1).padStart(2, '0');
                          const d = String(selected.getDate()).padStart(2, '0');
                          setDate(`${y}-${m}-${d}`);
                        }
                      }}
                    />
                  )}
                  {showTimePicker && DateTimePicker && (
                    <DateTimePicker
                      value={new Date()}
                      mode="time"
                      display="default"
                      onChange={(event, selected) => {
                        setShowTimePicker(false);
                        if (selected) {
                          const hh = String(selected.getHours()).padStart(2, '0');
                          const mm = String(selected.getMinutes()).padStart(2, '0');
                          setTime(`${hh}:${mm}`);
                        }
                      }}
                    />
                  )}
                </>
              )}
              <View style={{flexDirection:'row', justifyContent:'flex-end'}}>
                <TouchableOpacity onPress={() => setDateModalVisible(false)} style={[styles.modalButton, {backgroundColor:'#ccc'}]}>
                  <Text>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDateModalVisible(false)} style={[styles.modalButton, {backgroundColor:'#229954', marginLeft:8}]}> 
                  <Text style={{color:'#fff'}}>บันทึก</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>สถานที่</Text>
        <TextInput
          style={styles.input}
          placeholder="ระบุสถานที่ (ชื่อสถานที่, หรือที่อยู่)"
          value={location}
          onChangeText={setLocation}
        />

        <Text style={styles.label}>พิกัด (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="ตัวอย่าง: 13.7563,100.5018"
          value={coords}
          onChangeText={setCoords}
        />

        <Text style={styles.label}>ประเภท</Text>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.typeOption, type === opt && styles.typeOptionSelected]}
              onPress={() => setType(opt)}
            >
              <Text style={[styles.typeOptionText, type === opt && styles.typeOptionTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>คำบรรยายสั้น</Text>
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="คำอธิบายสั้นๆ (เหตุการณ์, สิ่งที่พบ)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>รูปแบบการส่ง</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeOption, submissionMode === 'anonymous' && styles.typeOptionSelected]}
            onPress={() => setSubmissionMode('anonymous')}
          >
            <Text style={[styles.typeOptionText, submissionMode === 'anonymous' && styles.typeOptionTextSelected]}>ไม่ระบุตัวตน</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, submissionMode === 'identified' && styles.typeOptionSelected]}
            onPress={() => setSubmissionMode('identified')}
          >
            <Text style={[styles.typeOptionText, submissionMode === 'identified' && styles.typeOptionTextSelected]}>ระบุตัวตน (ต้องการรับคำตอบ/รางวัล)</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.mapButton} onPress={() => window.open('https://www.google.com/maps','_blank')}>
          <Text style={styles.mapButtonText}>เลือกจากแผนที่</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageButton} onPress={pickMedia}>
          <MdAddAPhoto size={24} color="#fff" />
          <Text style={styles.imageButtonText}>แนบภาพ/วิดีโอ/สกรีนช็อต</Text>
        </TouchableOpacity>
        {mediaUri && mediaType === 'image' && (
          <Image source={{ uri: mediaUri }} style={styles.image} />
        )}
        {mediaUri && mediaType === 'video' && (
          <View style={styles.videoWrapper}>
            {Platform.OS === 'web' ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video controls src={mediaUri} style={styles.video} />
            ) : (
              <Text style={{textAlign:'center'}}>วิดีโอแนบ: {mediaUri}</Text>
            )}
          </View>
        )}
        <TouchableOpacity style={[styles.submitButton, styles.fullWidthButton]} onPress={handleSubmit}>
          <Text style={styles.submitText}>ส่งรายงาน</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#E9F7EF'
  },
  header: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 18, 
    color: '#229954',
    letterSpacing: 1,
    textAlign: 'center'
  },
  formBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#229954',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    color: '#229954',
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
    fontSize: 15,
  },
  input: { 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#229954',
    borderRadius: 10, 
    padding: 10, 
    marginBottom: 10, 
    backgroundColor: '#F8F9F9',
    fontSize: 16,
  },
  dateRow: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#229954',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#229954',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#229954',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  image: { 
    width: '100%', 
    maxWidth: 320,
    height: 220, 
    marginTop: 14, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#229954',
    alignSelf: 'center',
  },
  videoWrapper: {
    alignItems: 'center',
    marginTop: 12,
  },
  video: {
    width: '100%',
    maxWidth: 320,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  fullWidthButton: {
    alignSelf: 'stretch',
  },
  formContent: {
    paddingBottom: 24,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  typeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#229954',
    marginRight: 8,
    marginBottom: 6,
    backgroundColor: '#fff',
    flexShrink: 1,
    minWidth: 100,
  },
  typeOptionSelected: {
    backgroundColor: '#229954',
  },
  typeOptionText: {
    color: '#229954',
    fontWeight: '600',
    flexWrap: 'wrap',
    maxWidth: 160,
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submissionNote: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#F58220',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#F58220',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  mapButton: {
    backgroundColor: '#2E86C1',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
    alignSelf: 'stretch',
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});