import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import axios from "axios";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    try {
      await axios.post("http://10.204.233.188:5000/api/auth/register", {
        name,
        email,
        password,
      });
      Alert.alert("Register Success", "You can now login!");
      navigation.navigate("Login");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.msg || "Register failed");
    }
  };

  return (
    <View style={styles.container}>
      <Image source={sabanoorImg} style={styles.logo} />
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholderTextColor="#fff"
      />
      <TextInput
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholderTextColor="#fff"
      />
      <TextInput
        placeholder="password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#fff"
      />
      <TextInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#fff"
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
      <View style={styles.socialRow}>
        <Image source={googleImg} style={styles.socialIcon} />
        <Image source={facebookImg} style={styles.socialIcon} />
        <Image source={appleImg} style={styles.socialIcon} />
      </View>
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
});