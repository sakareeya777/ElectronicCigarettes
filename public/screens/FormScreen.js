import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';

export default function FormScreen() {
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    // ส่งข้อมูลรายงาน
    alert('ส่งรายงานเรียบร้อย!');
    setLocation('');
    setType('');
    setImage(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        <MaterialIcons name="report" size={28} color="#229954" /> รายงานแหล่งจำหน่าย/แหล่งมั่วสุม
      </Text>
      <View style={styles.formBox}>
        <Text style={styles.label}>สถานที่</Text>
        <TextInput
          style={styles.input}
          placeholder="ระบุสถานที่"
          value={location}
          onChangeText={setLocation}
        />
        <Text style={styles.label}>ประเภท</Text>
        <TextInput
          style={styles.input}
          placeholder="จำหน่าย/มั่วสุม"
          value={type}
          onChangeText={setType}
        />
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <MaterialIcons name="add-a-photo" size={24} color="#fff" />
          <Text style={styles.imageButtonText}>แนบภาพ</Text>
        </TouchableOpacity>
        {image && (
          <Image source={{ uri: image }} style={styles.image} />
        )}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>ส่งรายงาน</Text>
        </TouchableOpacity>
      </View>
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
    width: 220, 
    height: 220, 
    marginTop: 14, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#229954',
    alignSelf: 'center',
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
});