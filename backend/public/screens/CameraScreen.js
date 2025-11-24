import { View, Text, StyleSheet } from 'react-native';
import CameraViewScreen from '../components/CameraView';

export default function CameraScreen() {
  return (
    <>
     <CameraViewScreen/>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 20, fontWeight: 'bold' },
});