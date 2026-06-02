import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { selectAuth } from '../store/slices/authSlice';
import { useGamification } from './GamificationContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Provides a Socket.IO connection that auto-connects when user is authenticated.
 * Handles all real-time events and routes them to appropriate UI handlers.
 */
export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const auth = useSelector(selectAuth);
  const { triggerRewards } = useGamification();

  const connect = useCallback(() => {
    if (!auth.token || socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token: auth.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // ── Gamification events ──────────────────────────────────────────────

    socket.on('gamification:xp_update', (data) => {
      console.log('[Socket] xp_update:', data);
      // Trigger the floating XP popup and XP bar via GamificationContext
      if (data.xpGained > 0) {
        triggerRewards({
          xp: {
            gained: data.xpGained,
            oldXP: data.totalXP - data.xpGained,
            total: data.totalXP,
            oldLevel: data.level - (data.levelUp ? 1 : 0),
            level: data.level,
            levelUp: data.levelUp,
          },
        });
      }
    });

    socket.on('achievement:unlocked', (data) => {
      console.log('[Socket] achievement:unlocked:', data);
      toast.custom((t) => (
        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(99,91,255,0.2)',
            borderRadius: '16px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '280px',
            boxShadow: '0 8px 32px rgba(99,91,255,0.15)',
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: '12px',
            background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', flexShrink: 0,
          }}>
            {data.achievement?.emoji || '🏆'}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#635bff', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>
              Thành tựu mới!
            </p>
            <p style={{ color: '#1e1b4b', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px' }}>
              {data.achievement?.title}
            </p>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>
              +{data.achievement?.xpReward || 0} XP
            </p>
          </div>
        </div>
      ), { duration: 5000 });
    });

    socket.on('quest:completed', (data) => {
      console.log('[Socket] quest:completed:', data);
      toast.success(data.message || `Quest hoàn thành! +${data.xpReward} XP`, {
        icon: '🎯',
        duration: 4000,
      });
    });

    socket.on('quest:reward_claimed', (data) => {
      console.log('[Socket] quest:reward_claimed:', data);
      toast.success(`+${data.xpReward} XP đã được cộng!`, { icon: '⚡', duration: 3000 });
    });

    socket.on('streak:kept', (data) => {
      console.log('[Socket] streak:kept:', data);
      toast(data.message || `🔥 Streak ${data.currentStreak} ngày!`, {
        icon: '🔥',
        duration: 4000,
        style: { borderRadius: '12px' },
      });
    });

    socket.on('streak:broken', (data) => {
      console.log('[Socket] streak:broken:', data);
      toast.error(data.message || 'Streak đã bị gián đoạn. Bắt đầu lại ngay!', {
        icon: '😢',
        duration: 6000,
      });
    });

    // ── Leaderboard events ───────────────────────────────────────────────

    socket.on('leaderboard:update', (data) => {
      console.log('[Socket] leaderboard:update:', data);
      // Dispatch Redux action or call a refetch callback
      // Components listening to leaderboard will refetch via window event
      window.dispatchEvent(new CustomEvent('leaderboard:refresh', { detail: data }));
    });

    // ── Daily Challenge events ─────────────────────────────────────────────

    socket.on('dailyChallenge:leaderboard:update', (data) => {
      console.log('[Socket] dailyChallenge:leaderboard:update:', data);
      console.log('[Socket] dispatch dailyChallenge:leaderboard:refresh');
      window.dispatchEvent(new CustomEvent('dailyChallenge:leaderboard:refresh', { detail: data }));

      // Show a brief toast so User B sees who just earned XP
      if (data.reason === 'question_answered' && data.xpDelta) {
        toast(`🎯 ${data.username} vừa được +${data.xpDelta} XP!`, {
          icon: '🎯',
          duration: 2500,
        });
      }
    });

    // ── Notification events ─────────────────────────────────────────────

    socket.on('notification:new', (data) => {
      console.log('[Socket] notification:new:', data);
      const { notification } = data;
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      toast(notification.title, {
        icon: notification.type === 'achievement' ? '🏆'
          : notification.type === 'streak' ? '🔥'
          : notification.type === 'reminder' ? '⏰'
          : '🔔',
        duration: 4000,
      });
    });

    // ── Auth events ─────────────────────────────────────────────────────

    socket.on('auth:welcome', (data) => {
      console.log('[Socket] auth:welcome:', data);
      toast.success(data.message || 'Chào mừng đã gia nhập Memoris!', {
        icon: '👋',
        duration: 5000,
      });
    });

    socketRef.current = socket;
  }, [auth.token, triggerRewards]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Auto-connect when authenticated, disconnect when logged out
  useEffect(() => {
    if (auth.isAuthenticated && auth.token) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [auth.isAuthenticated, auth.token, connect, disconnect]);

  const markNotificationRead = useCallback((id) => {
    setUnreadCount(prev => Math.max(0, prev - 1));
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      unreadCount,
      setUnreadCount,
      notifications,
      markNotificationRead,
      clearUnread,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
