import { StyleSheet, View, Text, FlatList, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import Toast from 'react-native-toast-message';
import Player from '../models/Player';

export default function Leaderboard() {
  const { username, roomId, gameMode } = useLocalSearchParams<{ 
    username: string; 
    roomId: string;
    gameMode?: string;
  }>();

  const [players, setPlayers] = useState<Player[]>([]);
  const [isPlayingAgain, setIsPlayingAgain] = useState<boolean>(false);

  useEffect(() => {
    const getGameState = async () => {
      try {
        const response = await socketService.getGameState();
        if (response.success && response.gameState) {
          // Sort players by score (they should already be sorted by the game's endGame method)
          const sortedPlayers = [...response.gameState.players];
          setPlayers(sortedPlayers);
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to get final scores'
        });
      }
    };

    getGameState();
  }, [roomId, gameMode]);

  const handlePlayAgain = async () => {
    try {
      setIsPlayingAgain(true);
      
      // Navigate back to lobby
      router.replace({
        pathname: '/lobby',
        params: { 
          username: username!,
          roomId: roomId!,
          isHost: players.find(p => p.nickname === username)?.isHost ? 'true' : 'false'
        }
      });
      
      Toast.show({
        type: 'info',
        text1: 'Back to Lobby',
        text2: 'Ready for another game!'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to return to lobby'
      });
    } finally {
      setIsPlayingAgain(false);
    }
  };

  const getPodiumPosition = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  const getPodiumStyle = (index: number) => {
    switch (index) {
      case 0: return styles.firstPlace;
      case 1: return styles.secondPlace;
      case 2: return styles.thirdPlace;
      default: return styles.otherPlace;
    }
  };

  const renderPlayer = ({ item, index }: { item: Player, index: number }) => (
    <View style={[styles.playerCard, getPodiumStyle(index)]}>
      <View style={styles.positionContainer}>
        <Text style={styles.position}>{getPodiumPosition(index)}</Text>
      </View>
      
      <View style={styles.playerInfo}>
        <Text style={[
          styles.playerName,
          item.nickname === username && styles.currentPlayer
        ]}>
          {item.nickname}
          {item.isHost && <Text style={styles.hostBadge}> (HOST)</Text>}
        </Text>
        <Text style={styles.playerScore}>
          {item.score.toFixed(2)} {gameMode === 'minimum' ? 'consistency' : 'variance'} points
        </Text>
      </View>
    </View>
  );

  const winner = players[0];
  const gameTypeText = gameMode === 'minimum' ? 'Minimum Variance' : 'Maximum Variance';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Game Over! 🏆</Text>
      <Text style={styles.subtitle}>{gameTypeText} Mode</Text>
      
      {winner && (
        <View style={styles.winnerSection}>
          <Text style={styles.winnerText}>🎉 Winner: {winner.nickname}! 🎉</Text>
          <Text style={styles.winnerScore}>
            Final Score: {winner.score.toFixed(2)} points
          </Text>
        </View>
      )}

      <View style={styles.leaderboardSection}>
        <Text style={styles.sectionTitle}>Final Leaderboard</Text>
        <FlatList
          data={players}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={styles.leaderboardList}
        />
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[
            styles.playAgainButton,
            isPlayingAgain && styles.disabledButton
          ]}
          onPress={handlePlayAgain}
          disabled={isPlayingAgain}
        >
          <Text style={[
            styles.playAgainButtonText,
            isPlayingAgain && styles.disabledButtonText
          ]}>
            {isPlayingAgain ? 'Returning to Lobby...' : '🎮 Play Again'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.backButtonText}>🏠 Back to Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  winnerSection: {
    backgroundColor: '#FFD700',
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  winnerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  winnerScore: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  leaderboardSection: {
    flex: 1,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  leaderboardList: {
    flex: 1,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  firstPlace: {
    borderLeftWidth: 6,
    borderLeftColor: '#FFD700',
    backgroundColor: '#FFFACD',
  },
  secondPlace: {
    borderLeftWidth: 6,
    borderLeftColor: '#C0C0C0',
    backgroundColor: '#F8F8FF',
  },
  thirdPlace: {
    borderLeftWidth: 6,
    borderLeftColor: '#CD7F32',
    backgroundColor: '#FFF8DC',
  },
  otherPlace: {
    borderLeftWidth: 6,
    borderLeftColor: '#E0E0E0',
  },
  positionContainer: {
    width: 50,
    alignItems: 'center',
  },
  position: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  currentPlayer: {
    color: '#007AFF',
  },
  hostBadge: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: 'normal',
  },
  playerScore: {
    fontSize: 14,
    color: '#666',
  },
  buttonsContainer: {
    gap: 15,
  },
  playAgainButton: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  playAgainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#666',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
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