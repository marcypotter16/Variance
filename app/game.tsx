import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput, Modal, Dimensions } from "react-native";
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import Toast from 'react-native-toast-message';
import Player from '../models/Player';

interface Topic {
  id: string;
  text: string;
  proposedBy: string;
  proposerNickname: string;
}

interface ProposedWord {
  id: string;
  word: string;
  proposedBy: string;
  proposerNickname: string;
  relatedTopic: string;
  proposedAt: string;
}

interface Vote {
  playerId: string;
  playerNickname: string;
  wordId: string;
  score: number;
  votedAt: string;
}

interface VotingRound {
  id: string;
  word: ProposedWord;
  votes: Vote[];
  voteTimer: number;
  voteDeadline: string | null;
  isComplete: boolean;
}

interface GameState {
  state: string;
  players: Player[];
  topics: Topic[];
  currentPlayerTurn: string;
  currentVotingRound: VotingRound | null;
  completedRounds: VotingRound[];
  round: number;
  minimumVariance: boolean;
}

export default function Game() {
  const { username, roomId } = useLocalSearchParams<{ 
    username: string; 
    roomId: string; 
  }>();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [showTopicModal, setShowTopicModal] = useState<boolean>(false);
  const [isProposingWord, setIsProposingWord] = useState<boolean>(false);
  const [voteTimeLeft, setVoteTimeLeft] = useState<number>(0);
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  useEffect(() => {
    const getGameState = async () => {
      try {
        const response = await socketService.getGameState();
        if (response.success && response.gameState) {
          setGameState(response.gameState);
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
    const handleWordProposed = (data: { word: ProposedWord; gameState: GameState }) => {
      console.log('Word proposed:', data.word.word);
      setGameState(data.gameState);
      setVoteTimeLeft(30); // Reset vote timer
      setHasVoted(false);
      
      Toast.show({
        type: 'info',
        text1: 'Word Proposed',
        text2: `${data.word.proposerNickname} proposed "${data.word.word}"`
      });
    };

    const handleVoteCast = (data: { vote: Vote; gameState: GameState }) => {
      console.log('Vote cast:', data.vote.score, 'by', data.vote.playerNickname);
      setGameState(data.gameState);
    };

    const handleVotingCompleted = (data: { gameState: GameState }) => {
      console.log('Voting completed');
      setGameState(data.gameState);
      setVoteTimeLeft(0);
      
      if (data.gameState.currentVotingRound) {
        const totalScore = data.gameState.currentVotingRound.votes.reduce((sum, vote) => sum + vote.score, 0);
        const averageScore = data.gameState.currentVotingRound.votes.length > 0 ? 
          Math.round(totalScore / data.gameState.currentVotingRound.votes.length) : 0;
          
        Toast.show({
          type: 'success',
          text1: 'Voting Complete',
          text2: `Average score: ${averageScore}/10`
        });
      }
    };

    const handleNextPlayerTurn = (data: { gameState: GameState }) => {
      console.log('🔄 Next player turn event received:', data.gameState.currentPlayerTurn);
      console.log('🔄 Game state:', data.gameState.state);
      setGameState(data.gameState);
      setHasVoted(false);
    };

    const handleGameEnded = (data: { gameState: GameState }) => {
      console.log('🏆 Game ended! Navigating to leaderboard...');
      
      Toast.show({
        type: 'success',
        text1: '🏆 Game Complete!',
        text2: 'Check out the final scores!'
      });

      // Navigate to leaderboard with game state info
      setTimeout(() => {
        router.push({
          pathname: '/leaderboard',
          params: { 
            username: username!,
            roomId: roomId!,
            gameMode: data.gameState.minimumVariance ? 'minimum' : 'maximum'
          }
        });
      }, 2000); // Give time to read the toast
    };

    // Subscribe to events
    socketService.onWordProposed(handleWordProposed);
    socketService.onVoteCast(handleVoteCast);
    socketService.onVotingCompleted(handleVotingCompleted);
    socketService.onNextPlayerTurn(handleNextPlayerTurn);
    socketService.onGameEnded(handleGameEnded);

    getGameState();

    return () => {
      socketService.offWordProposed();
      socketService.offVoteCast();
      socketService.offVotingCompleted();
      socketService.offNextPlayerTurn();
      socketService.offGameEnded();
    };
  }, [roomId, username]);

  // Vote timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (voteTimeLeft > 0) {
      interval = setInterval(() => {
        setVoteTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [voteTimeLeft]);

  const handleProposeWord = async () => {
    if (currentWord.trim() === '') {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a word'
      });
      return;
    }

    if (selectedTopic === '') {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select a topic'
      });
      return;
    }

    try {
      setIsProposingWord(true);
      const response = await socketService.proposeWord(currentWord.trim(), selectedTopic);
      if (response.success) {
        setCurrentWord('');
        setSelectedTopic('');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Word proposed successfully!'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Failed to propose word'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to propose word'
      });
    } finally {
      setIsProposingWord(false);
    }
  };

  const handleVote = async (score: number) => {
    try {
      const response = await socketService.voteOnWord(score);
      if (response.success) {
        setHasVoted(true);
        Toast.show({
          type: 'success',
          text1: 'Vote Cast',
          text2: `You voted ${score}/10`
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Failed to vote'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to vote'
      });
    }
  };

  const renderPlayer = ({ item }: { item: Player }) => (
    <View style={styles.playerItem}>
      <Text style={styles.playerName}>{item.nickname}</Text>
      <Text style={styles.playerScore}>{item.score} pts</Text>
      {item.isHost && <Text style={styles.hostBadge}>HOST</Text>}
    </View>
  );

  const renderTopic = ({ item }: { item: Topic }) => (
    <TouchableOpacity 
      style={[
        styles.topicItem,
        selectedTopic === item.text && styles.selectedTopicItem
      ]}
      onPress={() => {
        setSelectedTopic(item.text);
        setShowTopicModal(false);
      }}
    >
      <Text style={[
        styles.topicText,
        selectedTopic === item.text && styles.selectedTopicText
      ]}>
        {item.text}
      </Text>
    </TouchableOpacity>
  );

  const renderVoteButton = (score: number) => (
    <TouchableOpacity
      key={score}
      style={styles.voteButton}
      onPress={() => handleVote(score)}
    >
      <Text style={styles.voteButtonText}>{score}</Text>
    </TouchableOpacity>
  );

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  const isMyTurn = gameState.currentPlayerTurn === username;
  const canVote = gameState.state === 'voting' && 
                  gameState.currentVotingRound && 
                  gameState.currentVotingRound.word.proposedBy !== gameState.players.find(p => p.nickname === username)?.id &&
                  !hasVoted;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎮 Variance Game 🎮</Text>
      <Text style={styles.subtitle}>Round {gameState.round}</Text>

      {/* Players List */}
      <View style={styles.playersSection}>
        <Text style={styles.sectionTitle}>Players & Scores</Text>
        <FlatList
          data={gameState.players}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.playersList}
        />
      </View>

      {/* Current Turn */}
      <View style={styles.turnSection}>
        <Text style={[
          styles.turnText,
          isMyTurn ? styles.myTurnText : styles.otherTurnText
        ]}>
          {isMyTurn ? "It's your turn to propose a word!" : `${gameState.currentPlayerTurn}'s turn`}
        </Text>
      </View>

      {/* Word Proposal (only for current player) */}
      {isMyTurn && gameState.state === 'playing' && (
        <View style={styles.wordProposalSection}>
          <TextInput
            style={styles.wordInput}
            placeholder="Enter your word..."
            value={currentWord}
            onChangeText={setCurrentWord}
            maxLength={50}
          />
          
          <TouchableOpacity 
            style={styles.topicSelector}
            onPress={() => setShowTopicModal(true)}
          >
            <Text style={styles.topicSelectorText}>
              {selectedTopic || 'Select a topic...'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.proposeButton,
              (isProposingWord || currentWord.trim() === '' || selectedTopic === '') && styles.disabledButton
            ]}
            onPress={handleProposeWord}
            disabled={isProposingWord || currentWord.trim() === '' || selectedTopic === ''}
          >
            <Text style={[
              styles.proposeButtonText,
              (isProposingWord || currentWord.trim() === '' || selectedTopic === '') && styles.disabledButtonText
            ]}>
              {isProposingWord ? 'Proposing...' : 'Propose Word'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Voting Section */}
      {gameState.state === 'voting' && gameState.currentVotingRound && (
        <View style={styles.votingSection}>
          <Text style={styles.votingTitle}>Vote on this word:</Text>
          <Text style={styles.proposedWord}>"{gameState.currentVotingRound.word.word}"</Text>
          <Text style={styles.wordTopic}>Topic: {gameState.currentVotingRound.word.relatedTopic}</Text>
          <Text style={styles.wordProposer}>Proposed by: {gameState.currentVotingRound.word.proposerNickname}</Text>
          
          {voteTimeLeft > 0 && (
            <Text style={styles.voteTimer}>Time left: {voteTimeLeft}s</Text>
          )}
          
          {canVote && (
            <View style={styles.voteButtonsContainer}>
              <Text style={styles.voteInstructions}>Rate from 1 to 10:</Text>
              <View style={styles.voteButtons}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(renderVoteButton)}
              </View>
            </View>
          )}
          
          {hasVoted && (
            <Text style={styles.votedText}>You have voted! Waiting for others...</Text>
          )}
          
          <Text style={styles.voteCount}>
            Votes: {gameState.currentVotingRound.votes.length}/{gameState.players.length - 1}
          </Text>
        </View>
      )}

      {/* Voting Results */}
      {gameState.state === 'voting_results' && gameState.currentVotingRound && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Voting Results</Text>
          <Text style={styles.resultsWord}>"{gameState.currentVotingRound.word.word}"</Text>
          <Text style={styles.resultsScore}>
            Average Score: {Math.round(
              gameState.currentVotingRound.votes.reduce((sum, vote) => sum + vote.score, 0) / 
              gameState.currentVotingRound.votes.length
            )}/10
          </Text>
        </View>
      )}

      {/* Topic Selection Modal */}
      <Modal
        visible={showTopicModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Topic</Text>
            <FlatList
              data={gameState.topics}
              renderItem={renderTopic}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowTopicModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
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
    backgroundColor: '#fff',
    padding: 12,
    marginRight: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  playerScore: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  hostBadge: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#34C759',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 4,
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
  wordProposalSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  wordInput: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  topicSelector: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  topicSelectorText: {
    fontSize: 16,
    color: '#666',
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
  votingSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  votingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  proposedWord: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  wordTopic: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  wordProposer: {
    fontSize: 14,
    color: '#999',
    marginBottom: 15,
  },
  voteTimer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 15,
  },
  voteButtonsContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  voteInstructions: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  voteButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  voteButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  voteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  votedText: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  voteCount: {
    fontSize: 14,
    color: '#666',
  },
  resultsSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  resultsWord: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  resultsScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  topicItem: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedTopicItem: {
    backgroundColor: '#007AFF',
  },
  topicText: {
    fontSize: 16,
    color: '#333',
  },
  selectedTopicText: {
    color: '#fff',
  },
  modalCloseButton: {
    backgroundColor: '#ccc',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#333',
  },
});