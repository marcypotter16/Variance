import { io, Socket } from 'socket.io-client';
import Player from '../models/Player';

class SocketService {
  private socket: Socket | null = null;
  private serverUrl = 'http://localhost:3001';

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  createRoom(nickname: string): Promise<{ success: boolean; room?: any; player?: any; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('create-room', { nickname }, (response: any) => {
        resolve(response);
      });
    });
  }

  joinRoom(roomId: string, nickname: string): Promise<{ success: boolean; room?: any; player?: any; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('join-room', { roomId, nickname }, (response: any) => {
        resolve(response);
      });
    });
  }

  startGame(maxRounds?: number, minimumVariance?: boolean): Promise<{ success: boolean; game?: any; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('start-game', { maxRounds, minimumVariance }, (response: any) => {
        resolve(response);
      });
    });
  }

  getRoomList(): Promise<{ success: boolean; rooms?: any[]; error?: string }> {
    // TODO: change any to Room
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('get-room-list', (response: any) => {
        resolve(response);
      });
    });
  }

  getPlayersList(roomId: string): Promise<{ success: boolean; players?: Player[]; error?: string}> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({success: false, error: 'Not connected to server'});
        return;
      }

      this.socket.emit('get-room-players', roomId, (response: { success: boolean; players?: Player[]; error?: string }) => {
        resolve(response);
      });
    });
  }

  onPlayerJoined(callback: (data: any) => void) {
    this.socket?.on('player-joined', callback);
  }

  onPlayerLeft(callback: (data: any) => void) {
    this.socket?.on('player-left', callback);
  }

  onGameStarted(callback: (data: any) => void) {
    this.socket?.on('game-started', callback);
  }

  proposeTopic(topic: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('propose-topic', { topic }, (response: { success: boolean; error?: string }) => {
        resolve(response);
      });
    });
  }

  getGameState(): Promise<{ success: boolean; gameState?: any; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('get-game-state', (response: { success: boolean; gameState?: any; error?: string }) => {
        resolve(response);
      });
    });
  }

  onTopicProposed(callback: (data: any) => void) {
    this.socket?.on('topic-proposed', callback);
  }

  onAllTopicsProposed(callback: (data: any) => void) {
    this.socket?.on('all-topics-proposed', callback);
  }

  offPlayerJoined() {
    this.socket?.off('player-joined');
  }

  offPlayerLeft() {
    this.socket?.off('player-left');
  }

  offGameStarted() {
    this.socket?.off('game-started');
  }

  offTopicProposed() {
    this.socket?.off('topic-proposed');
  }

  offAllTopicsProposed() {
    this.socket?.off('all-topics-proposed');
  }

  proposeWord(word: string, relatedTopic: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('propose-word', { word, relatedTopic }, (response: { success: boolean; error?: string }) => {
        resolve(response);
      });
    });
  }

  voteOnWord(score: number): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('vote-on-word', { score }, (response: { success: boolean; error?: string }) => {
        resolve(response);
      });
    });
  }

  onWordProposed(callback: (data: any) => void) {
    this.socket?.on('word-proposed', callback);
  }

  onVoteCast(callback: (data: any) => void) {
    this.socket?.on('vote-cast', callback);
  }

  onVotingCompleted(callback: (data: any) => void) {
    this.socket?.on('voting-completed', callback);
  }

  onNextPlayerTurn(callback: (data: any) => void) {
    this.socket?.on('next-player-turn', callback);
  }

  onGameEnded(callback: (data: any) => void) {
    this.socket?.on('game-ended', callback)
  }

  offWordProposed() {
    this.socket?.off('word-proposed');
  }

  offVoteCast() {
    this.socket?.off('vote-cast');
  }

  offVotingCompleted() {
    this.socket?.off('voting-completed');
  }

  offNextPlayerTurn() {
    this.socket?.off('next-player-turn');
  }

  offGameEnded() {
    this.socket?.off('game-ended');
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default new SocketService();