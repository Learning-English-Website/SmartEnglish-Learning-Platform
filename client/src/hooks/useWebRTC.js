import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
];

const buildIceServers = () => {
  const raw = import.meta.env.VITE_WEBRTC_ICE_SERVERS;
  if (!raw) return DEFAULT_ICE_SERVERS;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ICE_SERVERS;
  } catch {
    return DEFAULT_ICE_SERVERS;
  }
};

const getUserMediaStream = () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Trình duyệt không hỗ trợ camera hoặc microphone.');
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user',
    },
  });
};

export function useWebRTC({ socket, currentUser } = {}) {
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callInfoRef = useRef(null);
  const roleRef = useRef(null);

  const [callStatus, setCallStatus] = useState('idle');
  const [callInfo, setCallInfo] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState(null);

  const setCurrentCall = useCallback((nextCallInfo) => {
    callInfoRef.current = nextCallInfo;
    setCallInfo(nextCallInfo);
  }, []);

  const emitWithAck = useCallback((event, payload) => new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket chưa sẵn sàng.'));
      return;
    }

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Máy chủ không phản hồi.'));
    }, 10000);

    socket.emit(event, payload, (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);

      if (response?.success === false) {
        const error = new Error(response.message || 'Yêu cầu cuộc gọi thất bại.');
        error.code = response.code;
        reject(error);
      } else {
        resolve(response || { success: true });
      }
    });
  }), [socket]);

  const cleanup = useCallback((nextStatus = 'idle') => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    roleRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setIsMicMuted(false);
    setIsCameraOff(false);
    setCurrentCall(null);
    setCallStatus(nextStatus);
  }, [setCurrentCall]);

  const sendSignal = useCallback((signal) => {
    const callId = callInfoRef.current?.callId;
    if (!socket || !callId) return;
    socket.emit('call:signal', { callId, signal });
  }, [socket]);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await getUserMediaStream();
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc?.remoteDescription) return;

    const candidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of candidates) {
      await pc.addIceCandidate(candidate);
    }
  }, []);

  const createPeerConnection = useCallback(async () => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const localMediaStream = await ensureLocalStream();
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    const incomingRemoteStream = new MediaStream();

    localMediaStream.getTracks().forEach(track => pc.addTrack(track, localMediaStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach(track => {
        incomingRemoteStream.addTrack(track);
      });
      remoteStreamRef.current = incomingRemoteStream;
      setRemoteStream(incomingRemoteStream);
      setCallStatus('connected');
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected'].includes(pc.connectionState)) {
        setCallStatus('connecting');
      }
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [ensureLocalStream, sendSignal]);

  const startCall = useCallback(async ({ targetUserId, sessionId, student }) => {
    if (!targetUserId || !sessionId) {
      toast.error('Thiếu thông tin học viên để gọi.');
      return;
    }

    try {
      setError(null);
      setCallStatus('calling');
      const response = await emitWithAck('call:request', { targetUserId, sessionId });
      setCurrentCall({
        callId: response.callId,
        sessionId,
        targetUserId,
        peerUser: student,
        direction: 'outgoing',
      });
      roleRef.current = 'caller';
    } catch (err) {
      cleanup('idle');
      setError(err.message);
      toast.error(err.message);
    }
  }, [cleanup, emitWithAck, setCurrentCall]);

  const acceptCall = useCallback(async () => {
    const activeCall = callInfoRef.current;
    if (!activeCall?.callId) return;

    try {
      setError(null);
      setCallStatus('connecting');
      roleRef.current = 'receiver';
      await ensureLocalStream();
      await createPeerConnection();
      await emitWithAck('call:response', { callId: activeCall.callId, accepted: true });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      socket?.emit('call:hangup', { callId: activeCall.callId, reason: 'media_error' });
      cleanup('idle');
    }
  }, [cleanup, createPeerConnection, emitWithAck, ensureLocalStream, socket]);

  const rejectCall = useCallback(async () => {
    const activeCall = callInfoRef.current;
    if (!activeCall?.callId) {
      cleanup('idle');
      return;
    }

    try {
      await emitWithAck('call:response', { callId: activeCall.callId, accepted: false });
    } catch {
      // Another tab/device may have already answered this call. Do not end an accepted call from this fallback path.
    } finally {
      cleanup('idle');
    }
  }, [cleanup, emitWithAck]);

  const hangup = useCallback((reason = 'hangup') => {
    const activeCall = callInfoRef.current;
    if (activeCall?.callId) {
      socket?.emit('call:hangup', { callId: activeCall.callId, reason });
    }
    cleanup('idle');
  }, [cleanup, socket]);

  const toggleMic = useCallback(() => {
    const audioTracks = localStreamRef.current?.getAudioTracks() || [];
    if (audioTracks.length === 0) return;

    const nextMuted = !isMicMuted;
    audioTracks.forEach(track => {
      track.enabled = !nextMuted;
    });
    setIsMicMuted(nextMuted);
  }, [isMicMuted]);

  const toggleCamera = useCallback(() => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];
    if (videoTracks.length === 0) return;

    const nextOff = !isCameraOff;
    videoTracks.forEach(track => {
      track.enabled = !nextOff;
    });
    setIsCameraOff(nextOff);
  }, [isCameraOff]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleIncomingCall = (payload) => {
      if (!payload?.callId) return;
      if (callInfoRef.current) {
        socket.emit('call:response', { callId: payload.callId, accepted: false });
        return;
      }

      setError(null);
      setCurrentCall({
        callId: payload.callId,
        sessionId: payload.sessionId,
        peerUser: payload.fromUser,
        direction: 'incoming',
      });
      roleRef.current = 'receiver';
      setCallStatus('incoming');
    };

    const handleCallAccepted = async (payload) => {
      if (payload?.callId !== callInfoRef.current?.callId || roleRef.current !== 'caller') return;

      try {
        setCallStatus('connecting');
        const pc = await createPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: 'offer', sdp: pc.localDescription });
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
        hangup('media_error');
      }
    };

    const handleCallRejected = (payload) => {
      if (payload?.callId !== callInfoRef.current?.callId) return;
      toast('Học viên đã từ chối cuộc gọi.');
      cleanup('idle');
    };

    const handleAnsweredElsewhere = (payload) => {
      if (payload?.callId !== callInfoRef.current?.callId) return;
      if (payload?.answeredBySocketId === socket.id) return;

      cleanup('idle');
      toast('Cuộc gọi đã được nhận ở thiết bị khác.');
    };

    const handleCallEnded = (payload) => {
      if (payload?.callId && payload.callId !== callInfoRef.current?.callId) return;
      cleanup('idle');
      if (payload?.reason === 'timeout') {
        toast('Cuộc gọi đã hết hạn.');
      } else if (payload?.endedBy && payload.endedBy !== currentUser?._id) {
        toast('Bên kia đã kết thúc cuộc gọi.');
      }
    };

    const handleCallTimeout = (payload) => {
      if (payload?.callId && payload.callId !== callInfoRef.current?.callId) return;
      toast(payload?.message || 'Cuộc gọi đã hết hạn.');
      cleanup('idle');
    };

    const handleCallUnavailable = (payload) => {
      toast.error(payload?.message || 'Người nhận không trực tuyến.');
      cleanup('idle');
    };

    const handleCallBusy = (payload) => {
      toast.error(payload?.message || 'Một trong hai bên đang bận.');
      cleanup('idle');
    };

    const handleCallError = (payload) => {
      if (payload?.callId && payload.callId !== callInfoRef.current?.callId) return;
      const message = payload?.message || 'Cuộc gọi gặp lỗi.';
      setError(message);
      toast.error(message);
    };

    const handleSignal = async (payload) => {
      if (!payload?.signal || payload.callId !== callInfoRef.current?.callId) return;

      try {
        const pc = await createPeerConnection();
        const { signal } = payload;

        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushPendingCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: 'answer', sdp: pc.localDescription });
          setCallStatus('connecting');
        }

        if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushPendingCandidates();
          setCallStatus('connecting');
        }

        if (signal.type === 'ice-candidate' && signal.candidate) {
          const candidate = new RTCIceCandidate(signal.candidate);
          if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
        }
      } catch (err) {
        setError(err.message);
        toast.error('Không thể xử lý tín hiệu cuộc gọi.');
      }
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:answered_elsewhere', handleAnsweredElsewhere);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:timeout', handleCallTimeout);
    socket.on('call:unavailable', handleCallUnavailable);
    socket.on('call:busy', handleCallBusy);
    socket.on('call:error', handleCallError);
    socket.on('call:signal', handleSignal);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:answered_elsewhere', handleAnsweredElsewhere);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:timeout', handleCallTimeout);
      socket.off('call:unavailable', handleCallUnavailable);
      socket.off('call:busy', handleCallBusy);
      socket.off('call:error', handleCallError);
      socket.off('call:signal', handleSignal);
    };
  }, [cleanup, createPeerConnection, currentUser?._id, flushPendingCandidates, hangup, sendSignal, setCurrentCall, socket]);

  useEffect(() => () => {
    cleanup('idle');
  }, [cleanup]);

  return {
    callStatus,
    callInfo,
    localStream,
    remoteStream,
    isMicMuted,
    isCameraOff,
    error,
    startCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMic,
    toggleCamera,
  };
}
