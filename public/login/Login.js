import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import axios from "axios";
const sabanoorImg = require('../assets/sabanoor.jpg');
//import googleImg from '../assets/google.png';
//import facebookImg from '../assets/facebook.png';
//import appleImg from '../assets/apple.png';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://10.204.233.188:5000/api/auth/login", {
        email,
        password,
      });
      Alert.alert("Login Success", `Welcome ${res.data.name}`);
      navigation.navigate("MainTabs", {
        screen: "Profile",
        params: {
          _id: res.data._id,
          name: res.data.name,
          email: res.data.email,
          token: res.data.token,
        },
      });
    } catch (err) {
      Alert.alert("Error", err.response?.data?.msg || "Login failed");
    }
  };

  return (
    <View style={styles.container}>
      <Image source={sabanoorImg} style={styles.logo} />
      <Text style={styles.title}>Nice to see you!</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholderTextColor="#fff"
      />
      <TextInput
        placeholder="Enter Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#fff"
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <Text style={styles.bottomText}>
        Don't have an account yet?{" "}
        <Text style={styles.registerLink} onPress={() => navigation.navigate("Register")}>
          Register Now!
        </Text>
      </Text>
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
    marginBottom: 10,
  },
  socialIcon: {
    width: 32,
    height: 32,
    marginHorizontal: 8,
  },
  bottomText: {
    marginTop: 10,
    color: "#58595B", // เทา สสส
    fontSize: 14,
  },
  registerLink: {
    color: "#F58220", // ส้ม สสส
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});