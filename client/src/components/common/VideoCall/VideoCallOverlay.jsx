import { useEffect, useRef } from 'react';
import { Camera, CameraOff, Mic, MicOff, Phone, PhoneOff, UserRound, X } from 'lucide-react';
import './VideoCallOverlay.css';

function VideoPane({ stream, muted = false, label, isLocal = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`video-call-pane ${isLocal ? 'local' : 'remote'}`}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="video-call-video"
        />
      ) : (
        <div className="video-call-empty">
          <UserRound size={42} />
        </div>
      )}
      {label && <div className="video-call-label">{label}</div>}
    </div>
  );
}

function AudioStream({ stream, muted = false }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      muted={muted}
    />
  );
}

export default function VideoCallOverlay({
  callStatus,
  callInfo,
  localStream,
  remoteStream,
  isMicMuted,
  isCameraOff,
  error,
  onAccept,
  onReject,
  onHangup,
  onToggleMic,
  onToggleCamera,
}) {
  if (!callStatus || callStatus === 'idle') return null;

  const peerName = callInfo?.peerUser?.username || 'Người dùng';
  const isIncoming = callStatus === 'incoming';
  const isCalling = callStatus === 'calling';
  const isConnecting = callStatus === 'connecting';
  const isConnected = callStatus === 'connected';
  const callType = callInfo?.callType === 'audio' ? 'audio' : 'video';
  const callLabel = callType === 'audio' ? 'thoại' : 'video';

  return (
    <div className="video-call-overlay" role="dialog" aria-modal="true">
      <div className={`video-call-shell ${isIncoming || isCalling ? 'compact' : ''}`}>
        {(isIncoming || isCalling) ? (
          <div className="video-call-ringing">
            <button type="button" className="video-call-close" onClick={isIncoming ? onReject : onHangup} title="Đóng">
              <X size={18} />
            </button>

            <div className="video-call-avatar">
              {callInfo?.peerUser?.avatar ? (
                <img src={callInfo.peerUser.avatar} alt="" />
              ) : (
                <UserRound size={42} />
              )}
            </div>
            <div className="video-call-title">{peerName}</div>
            <div className="video-call-subtitle">
              {isIncoming ? `Đang gọi ${callLabel} cho bạn` : `Đang gọi ${callLabel}...`}
            </div>
            {error && <div className="video-call-error">{error}</div>}

            <div className="video-call-actions">
              {isIncoming && (
                <button type="button" className="video-call-action accept" onClick={onAccept} title="Chấp nhận">
                  <Phone size={22} />
                </button>
              )}
              <button type="button" className="video-call-action danger" onClick={isIncoming ? onReject : onHangup} title={isIncoming ? 'Từ chối' : 'Hủy cuộc gọi'}>
                <PhoneOff size={22} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {callType === 'audio' ? (
              <div className="video-call-audio-stage">
                <AudioStream stream={remoteStream} />
                <AudioStream stream={localStream} muted />
                <div className="video-call-avatar large">
                  {callInfo?.peerUser?.avatar ? (
                    <img src={callInfo.peerUser.avatar} alt="" />
                  ) : (
                    <UserRound size={58} />
                  )}
                </div>
                <div className="video-call-title">{peerName}</div>
                <div className="video-call-subtitle">
                  {isConnected ? 'Đang trong cuộc gọi thoại' : 'Đang kết nối âm thanh...'}
                </div>
              </div>
            ) : (
              <div className="video-call-stage">
                <VideoPane
                  stream={remoteStream}
                  label={isConnecting ? 'Đang kết nối...' : peerName}
                />
                <VideoPane
                  stream={localStream}
                  muted
                  label="Bạn"
                  isLocal
                />
              </div>
            )}

            <div className="video-call-toolbar">
              <div className="video-call-status">
                {isConnected ? `Đang trong cuộc gọi ${callLabel}` : 'Đang kết nối'}
              </div>
              {error && <div className="video-call-error inline">{error}</div>}
              <div className="video-call-controls">
                <button type="button" className={`video-call-control ${isMicMuted ? 'off' : ''}`} onClick={onToggleMic} title={isMicMuted ? 'Bật microphone' : 'Tắt microphone'}>
                  {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                {callType === 'video' && (
                  <button type="button" className={`video-call-control ${isCameraOff ? 'off' : ''}`} onClick={onToggleCamera} title={isCameraOff ? 'Bật camera' : 'Tắt camera'}>
                    {isCameraOff ? <CameraOff size={20} /> : <Camera size={20} />}
                  </button>
                )}
                <button type="button" className="video-call-control danger" onClick={onHangup} title="Cúp máy">
                  <PhoneOff size={20} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
