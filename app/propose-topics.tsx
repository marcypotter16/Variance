import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import Toast from 'react-native-toast-message';
import Player from '../models/Player';

interface PlayerWithProposal extends Player {
  hasProposed?: boolean;
}

interface Topic {
  id: string;
  text: string;
  proposedBy: string;
  proposerNickname: string;
}

export default function ProposeTopics() {
  const { username, roomId } = useLocalSearchParams<{ 
    username: string; 
    roomId: string; 
  }>();

  const [players, setPlayers] = useState<PlayerWithProposal[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
  const [currentPlayerTurn, setCurrentPlayerTurn] = useState<string>('');
  const [isProposing, setIsProposing] = useState<boolean>(false);

  useEffect(() => {
    const getGameState = async () => {
      try {
        const response = await socketService.getGameState();
        if (response.success && response.gameState) {
          // Handle initial game state
          setPlayers(response.gameState.players || []);
          setTopics(response.gameState.topics || []);
          setCurrentPlayerTurn(response.gameState.currentPlayerTurn || '');
          setIsMyTurn(response.gameState.currentPlayerTurn === username);
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to get game state'
        });
      }
    };

    // Set up event listeners
    const handleTopicProposed = (data: { topic: Topic; player: Player; gameState: any }) => {
      console.log('Topic proposed:', data.topic.text, 'by', data.player.nickname);
      setTopics(prev => [...prev, data.topic]);
      
      // Update player status
      setPlayers(prev => 
        prev.map(p => 
          p.id === data.player.id 
            ? { ...p, hasProposed: true }
            : p
        )
      );
      
      // Update turn
      if (data.gameState?.currentPlayerTurn) {
        setCurrentPlayerTurn(data.gameState.currentPlayerTurn);
        setIsMyTurn(data.gameState.currentPlayerTurn === username);
      }
    };

    const handleAllTopicsProposed = () => {
      Toast.show({
        type: 'success',
        text1: 'Topics Complete',
        text2: 'All players have proposed topics. Starting game!'
      });
      
      // Navigate to actual game
      setTimeout(() => {
        router.push({
          pathname: '/game',
          params: { 
            username: username!,
            roomId: roomId!
          }
        });
      }, 2000); // Give time to read the toast
    };

    // Subscribe to events
    socketService.onTopicProposed(handleTopicProposed);
    socketService.onAllTopicsProposed(handleAllTopicsProposed);

    getGameState();

    return () => {
      socketService.offTopicProposed();
      socketService.offAllTopicsProposed();
    };
  }, [roomId, username]);

  const handleProposeTopic = async () => {
    if (currentTopic.trim() === '') {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a topic'
      });
      return;
    }

    if (!isMyTurn) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'It\'s not your turn'
      });
      return;
    }

    try {
      setIsProposing(true);
      const response = await socketService.proposeTopic(currentTopic.trim());
      if (response.success) {
        setCurrentTopic('');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Topic proposed successfully!'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Failed to propose topic'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to propose topic'
      });
    } finally {
      setIsProposing(false);
    }
  };

  const renderPlayer = ({ item }: { item: Player }) => (
    <View style={styles.playerItem}>
      <Text style={styles.playerName}>{item.nickname}</Text>
      <View style={[
        styles.statusBadge, 
        item.hasProposed ? styles.proposedBadge : styles.waitingBadge
      ]}>
        <Text style={[
          styles.statusText,
          item.hasProposed ? styles.proposedText : styles.waitingText
        ]}>
          {item.hasProposed ? '✓' : '⏳'}
        </Text>
      </View>
    </View>
  );

  const renderTopic = ({ item }: { item: Topic }) => (
    <View style={styles.topicItem}>
      <Text style={styles.topicText}>{item.text}</Text>
      <Text style={styles.topicAuthor}>by {item.proposerNickname}</Text>
    </View>
  );

  const proposedCount = topics.length;
  const totalPlayers = players.length || 3; // Fallback for demo

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Propose Topics</Text>
      <Text style={styles.subtitle}>Each player proposes one topic</Text>
      
      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          Progress: {proposedCount}/{totalPlayers}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(proposedCount / totalPlayers) * 100}%` }
            ]} 
          />
        </View>
      </View>

      {currentPlayerTurn && (
        <View style={styles.turnSection}>
          <Text style={[
            styles.turnText,
            isMyTurn ? styles.myTurnText : styles.otherTurnText
          ]}>
            {isMyTurn 
              ? "It's your turn!" 
              : `Waiting for ${currentPlayerTurn}...`
            }
          </Text>
        </View>
      )}

      <View style={styles.playersSection}>
        <Text style={styles.sectionTitle}>Players</Text>
        <FlatList
          data={players}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id}
          style={styles.playersList}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={styles.topicsSection}>
        <Text style={styles.sectionTitle}>Proposed Topics</Text>
        <FlatList
          data={topics}
          renderItem={renderTopic}
          keyExtractor={(item) => item.id}
          style={styles.topicsList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {isMyTurn && (
        <View style={styles.inputSection}>
          <TextInput
            style={styles.topicInput}
            placeholder="Enter your topic..."
            value={currentTopic}
            onChangeText={setCurrentTopic}
            maxLength={100}
            multiline
          />
          <TouchableOpacity 
            style={[
              styles.proposeButton,
              (isProposing || currentTopic.trim() === '') && styles.disabledButton
            ]}
            onPress={handleProposeTopic}
            disabled={isProposing || currentTopic.trim() === ''}
          >
            <Text style={[
              styles.proposeButtonText,
              (isProposing || currentTopic.trim() === '') && styles.disabledButtonText
            ]}>
              {isProposing ? 'Proposing...' : 'Propose Topic'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  progressSection: {
    marginBottom: 30,
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  turnSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  turnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  myTurnText: {
    color: '#34C759',
  },
  otherTurnText: {
    color: '#666',
  },
  playersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  playersList: {
    maxHeight: 80,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginRight: 10,
    borderRadius: 8,
    minWidth: 100,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proposedBadge: {
    backgroundColor: '#34C759',
  },
  waitingBadge: {
    backgroundColor: '#FF9500',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  proposedText: {
    color: '#fff',
  },
  waitingText: {
    color: '#fff',
  },
  topicsSection: {
    flex: 1,
    marginBottom: 20,
  },
  topicsList: {
    flex: 1,
  },
  topicItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  topicText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  topicAuthor: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputSection: {
    backgroundColor: '#fff',
    padding: 20,
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
  topicInput: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  proposeButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  proposeButtonText: {
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