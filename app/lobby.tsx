import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput } from "react-native";
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import Toast from 'react-native-toast-message';
import Player from '../models/Player';

export default function Lobby() {
  const { username, roomId, isHost } = useLocalSearchParams<{ 
    username: string; 
    roomId: string; 
    isHost: string; 
  }>();

  const [players, setPlayers] = useState<Player[]>([]);
  const [connectedPlayers, setConnectedPlayers] = useState<number>(1);
  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [maxRounds, setMaxRounds] = useState<number>(1);
  const [minimumVariance, setMinimumVariance] = useState<boolean>(false);
  const [isStartingGame, setIsStartingGame] = useState<boolean>(false);

  useEffect(() => {
    const getPlayers = async () => {
      if (!roomId) return;
      
      try {
        const playersResponse = await socketService.getPlayersList(roomId);
        if (!playersResponse.success) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: playersResponse.error || 'Couldn\'t fetch players'
          });
          return;
        }
        
        const players = playersResponse.players || [];
        setPlayers(players);
        setConnectedPlayers(players.length);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch players'
        });
      }
    };

    // Set up event listeners for player updates
    const handlePlayerJoined = (data: { player: Player; room: any }) => {
      console.log('Player joined:', data.player.nickname);
      setPlayers(prev => {
        // Avoid duplicates
        const exists = prev.find(p => p.id === data.player.id);
        if (exists) return prev;
        return [...prev, data.player];
      });
      setConnectedPlayers(prev => prev + 1);
    };

    const handlePlayerLeft = (data: { player: Player; room: any }) => {
      console.log('Player left:', data.player.nickname);
      setPlayers(prev => prev.filter(p => p.id !== data.player.id));
      setConnectedPlayers(prev => Math.max(1, prev - 1));
    };

    const handleGameStarted = (data: any) => {
      console.log('Game started, navigating to propose topics');
      Toast.show({
        type: 'success',
        text1: 'Game Started',
        text2: 'Moving to topic proposal phase'
      });
      
      router.push({
        pathname: '/propose-topics',
        params: { 
          username: username!,
          roomId: roomId!
        }
      });
    };

    // Initialize players and set up listeners
    getPlayers();
    socketService.onPlayerJoined(handlePlayerJoined);
    socketService.onPlayerLeft(handlePlayerLeft);
    socketService.onGameStarted(handleGameStarted);

    // Cleanup on unmount
    return () => {
      socketService.offPlayerJoined();
      socketService.offPlayerLeft();
      socketService.offGameStarted();
    };
  }, [roomId, username, isHost]);

  const incrementMaxPlayers = () => {
    if (maxPlayers < 20) {
      setMaxPlayers(maxPlayers + 1);
      // TODO: Send to API to update room settings
    }
  };

  const decrementMaxPlayers = () => {
    if (maxPlayers > 2) {
      setMaxPlayers(maxPlayers - 1);
      // TODO: Send to API to update room settings
    }
  };

  const incrementMaxRounds = () => {
    if (maxRounds < 10) {
      setMaxRounds(maxRounds + 1);
    }
  };

  const decrementMaxRounds = () => {
    if (maxRounds > 1) {
      setMaxRounds(maxRounds - 1);
    }
  };

  const handleStartGame = async () => {
    if (connectedPlayers < 2) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Need at least 2 players to start the game'
      });
      return;
    }

    if (connectedPlayers < maxPlayers) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Not enough players'
      })
      return
    }
    try {
      setIsStartingGame(true);
      const response = await socketService.startGame(maxRounds, minimumVariance);
      console.log(response)
      if (response.success) {
        // Navigation will be handled by the game-started event listener
        // The toast and navigation are in handleGameStarted function
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Failed to start game'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to start game'
      });
    } finally {
      setIsStartingGame(false);
    }
  };

  const renderPlayer = ({ item }: { item: Player }) => (
    <View style={styles.playerItem}>
      <Text style={styles.playerName}>{item.nickname}</Text>
      {item.isHost && <Text style={styles.hostBadge}>HOST</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome to the lobby, {username}!</Text>
      <Text style={styles.roomText}>Room ID: {roomId}</Text>
      {isHost === 'true' && (
        <Text style={styles.hostText}>You are the host</Text>
      )}
      
      {isHost === 'true' && (
        <View style={styles.hostControls}>
          <Text style={styles.hostControlsTitle}>Host Controls</Text>
          
          <View style={styles.maxPlayersControl}>
            <Text style={styles.controlLabel}>Max Players:</Text>
            <View style={styles.playerCounterContainer}>
              <TouchableOpacity 
                style={[styles.counterButton, maxPlayers <= 2 && styles.disabledCounterButton]}
                onPress={decrementMaxPlayers}
                disabled={maxPlayers <= 2}
              >
                <Text style={[styles.counterButtonText, maxPlayers <= 2 && styles.disabledCounterText]}>-</Text>
              </TouchableOpacity>
              
              <Text style={styles.playerCountText}>{maxPlayers}</Text>
              
              <TouchableOpacity 
                style={[styles.counterButton, maxPlayers >= 20 && styles.disabledCounterButton]}
                onPress={incrementMaxPlayers}
                disabled={maxPlayers >= 20}
              >
                <Text style={[styles.counterButtonText, maxPlayers >= 20 && styles.disabledCounterText]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.maxRoundsControl}>
            <Text style={styles.controlLabel}>Max Rounds:</Text>
            <View style={styles.playerCounterContainer}>
              <TouchableOpacity 
                style={[styles.counterButton, maxRounds <= 1 && styles.disabledCounterButton]}
                onPress={decrementMaxRounds}
                disabled={maxRounds <= 1}
              >
                <Text style={[styles.counterButtonText, maxRounds <= 1 && styles.disabledCounterText]}>-</Text>
              </TouchableOpacity>
              
              <Text style={styles.playerCountText}>{maxRounds}</Text>
              
              <TouchableOpacity 
                style={[styles.counterButton, maxRounds >= 10 && styles.disabledCounterButton]}
                onPress={incrementMaxRounds}
                disabled={maxRounds >= 10}
              >
                <Text style={[styles.counterButtonText, maxRounds >= 10 && styles.disabledCounterText]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.checkboxControl}>
            <Text style={styles.controlLabel}>Minimum Variance Mode:</Text>
            <TouchableOpacity 
              style={[styles.checkbox, minimumVariance && styles.checkboxChecked]}
              onPress={() => setMinimumVariance(!minimumVariance)}
            >
              {minimumVariance && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.playersSection}>
        <Text style={styles.playersTitle}>
          Players ({connectedPlayers}/{maxPlayers})
        </Text>
        <FlatList
          data={players}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id}
          style={styles.playersList}
          showsVerticalScrollIndicator={false}
        />
      </View>
      
      {connectedPlayers < 2 && (
        <Text style={styles.subtitle}>Waiting for other players to join...</Text>
      )}
      
      {isHost === 'true' && (
        <TouchableOpacity 
          style={[
            styles.startGameButton, 
            (connectedPlayers < 2 || isStartingGame) && styles.disabledButton
          ]}
          onPress={handleStartGame}
          disabled={connectedPlayers < 2 || isStartingGame}
        >
          <Text style={[
            styles.startGameButtonText,
            (connectedPlayers < 2 || isStartingGame) && styles.disabledButtonText
          ]}>
            {isStartingGame ? 'Starting...' : 'Start Game'}
          </Text>
        </TouchableOpacity>
      )}
      
      {connectedPlayers >= 2 && isHost !== 'true' && (
        <Text style={styles.readyText}>Waiting for host to start the game</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  roomText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
    fontFamily: 'monospace',
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 5,
  },
  hostText: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  playersSection: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  playersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  playersList: {
    maxHeight: 200,
    width: '100%',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  playerName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  hostBadge: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  readyText: {
    fontSize: 16,
    color: '#34C759',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: 'bold',
  },
  hostControls: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
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
  hostControlsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  maxPlayersControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  maxRoundsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  checkboxControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  playerCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterButton: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  disabledCounterButton: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  counterButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  disabledCounterText: {
    opacity: 0.5,
  },
  playerCountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  startGameButton: {
    width: '100%',
    maxWidth: 400,
    height: 60,
    backgroundColor: '#34C759',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  startGameButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  disabledButtonText: {
    opacity: 0.6,
  },
});