import { StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import socketService from '../services/socketService';
import Toast from 'react-native-toast-message';

export default function HostJoin() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [roomId, setRoomId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    connectToServer();
    
    return () => {
      socketService.disconnect();
    };
  }, []);

  const connectToServer = async () => {
    try {
      setIsConnecting(true);
      await socketService.connect();
      setIsConnected(true);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Could not connect to server. Make sure the variance-api is running.'
      });
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleHost = async () => {
    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Not connected to server'
      });
      // router.replace('/')
      return;
    }

    try {
      const response = await socketService.createRoom(username!);
      if (response.success) {
        router.push({
          pathname: '/lobby',
          params: { 
            username: username!,
            roomId: response.room.id,
            isHost: 'true'
          }
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Failed to create room'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create room'
      });
    }
  };

  const handleJoin = async () => {
    if (roomId.trim() === '' || !isConnected) return;
    
    try {
      const response = await socketService.joinRoom(roomId.trim(), username!);
      if (response.success) {
        router.push({
          pathname: '/lobby',
          params: { 
            username: username!,
            roomId: response.room.id,
            isHost: 'false'
          }
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Failed to join room'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to join room'
      });
    }
  };

  const isJoinDisabled = roomId.trim() === '' || !isConnected;

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome, {username}!</Text>
      <Text style={styles.subtitle}>Choose an option to continue</Text>
      
      {isConnecting && (
        <Text style={styles.statusText}>Connecting to server...</Text>
      )}
      {!isConnecting && !isConnected && (
        <Text style={styles.errorText}>⚠️ Not connected to server</Text>
      )}
      {isConnected && (
        <Text style={styles.successText}>✅ Connected to server</Text>
      )}
      
      <TouchableOpacity style={[styles.button, styles.hostButton]} onPress={handleHost}>
        <Text style={styles.buttonText}>Host Room</Text>
        <Text style={styles.buttonSubtext}>Create a new game room</Text>
      </TouchableOpacity>
      
      <View style={styles.joinSection}>
        <TextInput
          style={styles.roomIdInput}
          placeholder="Enter Room ID"
          value={roomId}
          onChangeText={setRoomId}
          maxLength={20}
        />
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.joinButton, 
            isJoinDisabled && styles.disabledButton
          ]} 
          onPress={handleJoin}
          disabled={isJoinDisabled}
        >
          <Text style={[styles.buttonText, isJoinDisabled && styles.disabledButtonText]}>
            Join Room
          </Text>
          <Text style={[styles.buttonSubtext, isJoinDisabled && styles.disabledButtonText]}>
            Join an existing room
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    maxWidth: 300,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hostButton: {
    backgroundColor: '#34C759',
  },
  joinButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buttonSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  joinSection: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  roomIdInput: {
    width: '100%',
    height: 50,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  disabledButtonText: {
    opacity: 0.6,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 20,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#34C759',
    marginBottom: 20,
    textAlign: 'center',
  },
});