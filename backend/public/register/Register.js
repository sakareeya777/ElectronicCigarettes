import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from "react-native";
import axios from "axios";
import { useUserAuth } from "../context/UserAuthContext";
import { getAuth, updateProfile } from "firebase/auth";
const sabanoorImg = require('../assets/sabanoor.jpg');

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // 'error' or 'success'
  const { signup } = useUserAuth() || {};


  function validateEmail(email) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!name || !normalizedEmail || !password || !confirmPassword) {
      setMessage("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      setMessageType("error");
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setMessage("รูปแบบอีเมลไม่ถูกต้อง");
      setMessageType("error");
      return;
    }
    if (password.length < 6) {
      setMessage("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      setMessageType("error");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("รหัสผ่านไม่ตรงกัน");
      setMessageType("error");
      return;
    }
    try {
      const userCredential = await signup(normalizedEmail, password);
      // Set displayName for the new user
      const auth = getAuth();
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
      }
      setMessage("สมัครสมาชิกสำเร็จ! สามารถเข้าสู่ระบบได้แล้ว");
      setMessageType("success");
      setTimeout(() => {
        navigation.navigate("Login");
      }, 1200);
    } catch (err) {
      console.error('Register error', err)
      const backendMsg = err?.response?.data?.error?.message || err?.message || err?.code
      let msg = "เกิดข้อผิดพลาด กรุณาตรวจสอบข้อมูลอีกครั้ง";
      if (backendMsg) {
        if (backendMsg.includes('EMAIL_EXISTS')) msg = 'อีเมลนี้ถูกใช้ไปแล้ว';
        else if (backendMsg.includes('INVALID_EMAIL')) msg = 'อีเมลไม่ถูกต้อง';
        else msg = backendMsg
      }
      setMessage(msg);
      setMessageType("error");
    }
  };

  return (
    <View style={styles.container}>
      <Image source={sabanoorImg} style={styles.logo} />
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={styles.input}
        placeholderTextColor="#fff"
        autoCapitalize="words"
      />
      <TextInput
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
        placeholderTextColor="#fff"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#fff"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#fff"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Sign up</Text>
      </TouchableOpacity>
      {message && (
        <View style={[styles.msgBox, messageType === 'error' ? styles.msgError : styles.msgSuccess]}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>{message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // ขาว
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    resizeMode: "contain",
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    color: "#7AC143", // เขียว สสส
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#F58220", // ส้ม สสส
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    color: "#FFFFFF", // ขาว
    fontSize: 16,
  },
  button: {
    backgroundColor: "#7AC143", // เขียว สสส
    borderRadius: 10,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  buttonText: {
    color: "#FFFFFF", // ขาว
    fontWeight: "bold",
    fontSize: 16,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  socialIcon: {
    width: 32,
    height: 32,
    marginHorizontal: 8,
  },
  msgBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    minWidth: 200,
    alignSelf: 'center',
    opacity: 0.95,
  },
  msgError: {
    backgroundColor: '#e74c3c',
  },
  msgSuccess: {
    backgroundColor: '#2ecc71',
  }
});