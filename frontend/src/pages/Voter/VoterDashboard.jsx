import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Camera, Mic, MicOff, AlertTriangle, CheckCircle, ChevronRight, Shield, Volume2, CameraOff, RefreshCw, XCircle, Bell, Minimize2, Maximize2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { message } from 'antd';
import { candidateService } from '../../services/candidateService';
import { voteService } from '../../services/voteService';

// ─── Permission Gate Hook ────────────────────────────────────────────────────
const usePermissions = () => {
  const [permissions, setPermissions] = useState({ camera: 'pending', microphone: 'pending', checking: true });

  const requestPermissions = useCallback(async () => {
    setPermissions((p) => ({ ...p, checking: true }));
    let cameraStatus = 'denied', micStatus = 'denied', stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStatus = 'granted'; micStatus = 'granted';
    } catch {
      try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); cameraStatus = 'granted'; s.getTracks().forEach(t => t.stop()); } catch { cameraStatus = 'denied'; }
      try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); micStatus = 'granted'; s.getTracks().forEach(t => t.stop()); } catch { micStatus = 'denied'; }
    } finally {
      stream?.getTracks().forEach(t => t.stop());
      setPermissions({ camera: cameraStatus, microphone: micStatus, checking: false });
    }
  }, []);

  useEffect(() => { requestPermissions(); }, [requestPermissions]);
  const allGranted = permissions.camera === 'granted' && permissions.microphone === 'granted';
  return { permissions, allGranted, requestPermissions };
};

// ─── Audio Monitor Hook ──────────────────────────────────────────────────────
const useAudioMonitor = (active) => {
  const [audioState, setAudioState] = useState({ volume: 0, isHighNoise: false, isHumanVoice: false });
  const audioCtxRef = useRef(null), streamRef = useRef(null), animFrameRef = useRef(null);
  const baselineRef = useRef(null), historyRef = useRef({ volume: [], voice: [] });
  const HISTORY_LEN = 25;

  const stop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    streamRef.current = audioCtxRef.current = baselineRef.current = null;
    historyRef.current = { volume: [], voice: [] };
  }, []);

  useEffect(() => {
    if (!active) { stop(); return; }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.2;
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        const timeArray = new Uint8Array(bufferLength), freqArray = new Uint8Array(bufferLength);
        const calibSamples = [], calibStart = performance.now();
        await new Promise(resolve => {
          const calibrate = () => {
            if (performance.now() - calibStart < 1500) {
              analyser.getByteTimeDomainData(timeArray);
              let sum = 0;
              for (let i = 0; i < bufferLength; i++) { const v = (timeArray[i] - 128) / 128; sum += v * v; }
              calibSamples.push(Math.sqrt(sum / bufferLength) * 500);
              requestAnimationFrame(calibrate);
            } else {
              const avg = calibSamples.reduce((a, b) => a + b, 0) / calibSamples.length;
              baselineRef.current = Math.max(3, avg + 1.5); resolve();
            }
          };
          calibrate();
        });
        if (cancelled) return;
        const getBandEnergy = (lowHz, highHz) => {
          const binHz = (ctx.sampleRate / 2) / bufferLength;
          const low = Math.floor(lowHz / binHz), high = Math.min(Math.ceil(highHz / binHz), bufferLength - 1);
          let energy = 0;
          for (let i = low; i <= high; i++) energy += freqArray[i];
          return energy / (high - low + 1);
        };
        const pushHistory = (arr, val) => { arr.push(val); if (arr.length > HISTORY_LEN) arr.shift(); return arr.reduce((a, b) => a + b, 0) / arr.length; };
        const tick = () => {
          animFrameRef.current = requestAnimationFrame(tick);
          analyser.getByteTimeDomainData(timeArray); analyser.getByteFrequencyData(freqArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) { const v = (timeArray[i] - 128) / 128; sum += v * v; }
          const rawVol = Math.min(100, Math.round(Math.sqrt(sum / bufferLength) * 500));
          const smoothVol = Math.round(pushHistory(historyRef.current.volume, rawVol));
          const baseline = baselineRef.current ?? 3;
          const isHighNoise = smoothVol > baseline * 1.3;
          const pitchEnergy = getBandEnergy(85, 300), formantEnergy = getBandEnergy(300, 3400);
          const subEnergy = getBandEnergy(20, 85), airEnergy = getBandEnergy(3400, 8000);
          const voiceScore = (pitchEnergy > 4 ? 1 : 0) + (formantEnergy > 3 ? 1 : 0) + (formantEnergy > subEnergy * 0.3 ? 1 : 0) + (pitchEnergy > airEnergy * 0.4 ? 1 : 0);
          const rawIsVoice = rawVol > baseline && voiceScore >= 2;
          const voiceConfidence = pushHistory(historyRef.current.voice, rawIsVoice ? 1 : 0);
          setAudioState({ volume: smoothVol, isHighNoise, isHumanVoice: voiceConfidence >= 0.35 });
        };
        tick();
      } catch { }
    })();
    return () => { cancelled = true; stop(); };
  }, [active, stop]);

  return audioState;
};

// ─── Motion Detector Hook ─────────────────────────────────────────────────────
const useMotionDetector = (active) => {
  const [motionState, setMotionState] = useState({ motionScore: 0, isMotionDetected: false });
  const animFrameRef = useRef(null), streamRef = useRef(null), prevFrameRef = useRef(null), historyRef = useRef([]);
  const HISTORY_LEN = 20;

  const stop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = prevFrameRef.current = null; historyRef.current = [];
  }, []);

  useEffect(() => {
    if (!active) { stop(); return; }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = document.createElement('video');
        video.srcObject = stream; video.muted = true; video.playsInline = true;
        await video.play();
        const W = 80, H = 60, canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx2d = canvas.getContext('2d');
        const tick = () => {
          animFrameRef.current = requestAnimationFrame(tick);
          if (video.readyState < 2) return;
          ctx2d.drawImage(video, 0, 0, W, H);
          const frame = ctx2d.getImageData(0, 0, W, H).data;
          if (prevFrameRef.current) {
            const prev = prevFrameRef.current;
            let diffSum = 0;
            for (let i = 0; i < frame.length; i += 4)
              diffSum += (Math.abs(frame[i] - prev[i]) + Math.abs(frame[i + 1] - prev[i + 1]) + Math.abs(frame[i + 2] - prev[i + 2])) / 3;
            const rawScore = Math.min(100, Math.round((diffSum / (W * H)) * 2));
            historyRef.current.push(rawScore);
            if (historyRef.current.length > HISTORY_LEN) historyRef.current.shift();
            const smoothScore = Math.round(historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length);
            setMotionState({ motionScore: smoothScore, isMotionDetected: smoothScore > 3 });
          }
          prevFrameRef.current = new Uint8ClampedArray(frame);
        };
        tick();
      } catch { }
    })();
    return () => { cancelled = true; stop(); };
  }, [active, stop]);

  return motionState;
};

// ─── Floating Camera Widget ───────────────────────────────────────────────────
// ✅ On mobile: smaller (140px), positioned bottom-right to avoid content overlap
const FloatingCamera = ({ audioState, motionState }) => {
  const videoRef = useRef(null), streamRef = useRef(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch { }
    })();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const { volume, isHighNoise, isHumanVoice } = audioState;
  const { motionScore, isMotionDetected } = motionState;
  const isUnsafe = isHighNoise || isHumanVoice || isMotionDetected;

  return (
    <div
      style={{
        position: 'fixed',
        // Bottom-right on mobile, top-right on desktop
        bottom: 16,
        right: 16,
        zIndex: 50,
        width: minimized ? 44 : 'clamp(130px, 25vw, 180px)',
      }}
      className="transition-all duration-300 sm:top-5 sm:bottom-auto"
    >
      <div className={`rounded-2xl overflow-hidden shadow-2xl border-2 ${isUnsafe ? 'border-red-400' : 'border-green-400'} bg-gray-900`}>
        <button
          onClick={() => setMinimized(m => !m)}
          className="w-full flex items-center justify-between px-2 py-1.5 bg-black/70 text-white text-xs gap-1 hover:bg-black/80 transition-colors"
        >
          <div className="flex items-center gap-1">
            <Camera size={10} />
            {!minimized && <span className="font-medium">LIVE</span>}
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {!minimized && (
              <span className={`text-xs font-semibold ${isUnsafe ? 'text-red-400' : 'text-green-400'}`}>
                {isUnsafe ? '⚠' : '✓'}
              </span>
            )}
          </div>
        </button>
        {!minimized && (
          <>
            <div style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            </div>
            <div className="bg-black/80 px-2 py-1.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <Volume2 size={9} className="text-gray-400 shrink-0" />
                <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-100" style={{ width: `${volume}%`, background: volume > 40 ? '#ef4444' : volume > 20 ? '#f59e0b' : '#22c55e' }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Camera size={9} className="text-gray-400 shrink-0" />
                <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-100" style={{ width: `${Math.min(100, motionScore * 5)}%`, background: motionScore > 3 ? '#ef4444' : '#22c55e' }} />
                </div>
              </div>
              {isHighNoise    && <p className="text-red-400 text-[10px] flex items-center gap-1"><AlertTriangle size={8} /> Noise</p>}
              {isHumanVoice  && <p className="text-red-400 text-[10px] flex items-center gap-1"><Mic size={8} /> Voice</p>}
              {isMotionDetected && <p className="text-red-400 text-[10px] flex items-center gap-1"><AlertTriangle size={8} /> Motion</p>}
              {!isUnsafe     && <p className="text-green-400 text-[10px] flex items-center gap-1"><CheckCircle size={8} /> Clear</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Permission Gate Screen ───────────────────────────────────────────────────
const PermissionGate = ({ permissions, checking, onRetry }) => {
  const items = [
    { key: 'camera', label: 'Camera', desc: 'Required to verify your identity during voting', grantedIcon: Camera, deniedIcon: CameraOff, status: permissions.camera },
    { key: 'microphone', label: 'Microphone', desc: 'Required to detect background noise and ensure voting privacy', grantedIcon: Mic, deniedIcon: MicOff, status: permissions.microphone },
  ];
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-200 p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Permissions Required</h2>
          <p className="text-xs sm:text-sm text-gray-500">Camera and microphone access are mandatory for a secure voting process.</p>
        </div>
        <div className="space-y-3 mb-6">
          {items.map(({ key, label, desc, grantedIcon: GrantedIcon, deniedIcon: DeniedIcon, status }) => {
            const isGranted = status === 'granted', isDenied = status === 'denied', isPending = status === 'pending';
            const Icon = isGranted ? GrantedIcon : DeniedIcon;
            return (
              <div key={key} className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all ${isGranted ? 'border-green-200 bg-green-50' : isDenied ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${isGranted ? 'bg-green-100' : isDenied ? 'bg-red-100' : 'bg-gray-200'}`}>
                  <Icon size={16} className={isGranted ? 'text-green-600' : isDenied ? 'text-red-600' : 'text-gray-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`font-semibold text-sm ${isGranted ? 'text-green-800' : isDenied ? 'text-red-800' : 'text-gray-700'}`}>{label}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${isGranted ? 'bg-green-200 text-green-800' : isDenied ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-600'}`}>
                      {isPending ? 'Checking…' : isGranted ? '✓ Allowed' : '✗ Blocked'}
                    </span>
                  </div>
                  <p className={`text-xs ${isGranted ? 'text-green-700' : isDenied ? 'text-red-700' : 'text-gray-500'}`}>{desc}</p>
                  {isDenied && <p className="text-xs mt-2 text-red-600 font-medium leading-relaxed">ⓘ Tap the lock icon in your browser → allow {label.toLowerCase()} → tap Retry.</p>}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onRetry} disabled={checking} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm sm:text-base">
          {checking ? <><RefreshCw size={15} className="animate-spin" /> Checking…</> : <><RefreshCw size={15} /> Retry Permissions</>}
        </button>
        <p className="text-center text-xs text-gray-400 mt-4">Both must be allowed to proceed.</p>
      </div>
    </div>
  );
};

// ─── Warning Overlay ──────────────────────────────────────────────────────────
const WarningOverlay = ({ warningCount, reasons, onDismiss }) => {
  const isSecondWarning = warningCount >= 2;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-sm rounded-2xl shadow-2xl border-2 p-6 sm:p-8 text-center ${isSecondWarning ? 'bg-red-900 border-red-500' : 'bg-amber-900 border-amber-500'}`}
        style={{ animation: 'fadeScaleIn 0.3s ease-out' }}
      >
        <style>{`@keyframes fadeScaleIn { from { opacity:0; transform: scale(0.85) translateY(20px); } to { opacity:1; transform: scale(1) translateY(0); } }`}</style>
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${isSecondWarning ? 'bg-red-700' : 'bg-amber-700'}`}>
          {isSecondWarning ? <XCircle className="w-8 h-8 sm:w-9 sm:h-9 text-red-200" /> : <Bell className="w-8 h-8 sm:w-9 sm:h-9 text-amber-200" />}
        </div>
        <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${isSecondWarning ? 'text-red-400' : 'text-amber-400'}`}>
          Warning {warningCount} of 2
        </div>
        <h2 className={`text-lg sm:text-xl font-bold mb-2 sm:mb-3 ${isSecondWarning ? 'text-red-100' : 'text-amber-100'}`}>
          {isSecondWarning ? '⚠️ Final Warning!' : '⚠️ Environment Alert'}
        </h2>
        <p className={`text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed ${isSecondWarning ? 'text-red-200' : 'text-amber-200'}`}>
          {isSecondWarning
            ? 'This is your LAST warning. If violations continue, your vote will be automatically cast as NOTA and the session will end.'
            : 'Suspicious activity has been detected. Please ensure you are alone and in a quiet environment.'}
        </p>
        <div className={`text-xs rounded-xl px-3 py-2 mb-4 sm:mb-6 ${isSecondWarning ? 'bg-red-800 text-red-200' : 'bg-amber-800 text-amber-200'}`}>
          Detected: <span className="font-semibold capitalize">{reasons}</span>
        </div>
        <button onClick={onDismiss} className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-colors ${isSecondWarning ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'}`}>
          I Understand — I'll Fix It
        </button>
      </div>
    </div>
  );
};

// ─── NOTA Termination Screen ──────────────────────────────────────────────────
const NOTAScreen = ({ voter }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-8">
    <div className="max-w-sm w-full bg-gray-900 rounded-2xl shadow-2xl border-2 border-red-700 p-6 sm:p-8 text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
        <XCircle className="w-8 h-8 sm:w-9 sm:h-9 text-red-400" />
      </div>
      <div className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Session Terminated</div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Vote Recorded as NOTA</h2>
      <p className="text-gray-400 text-xs sm:text-sm mb-5 sm:mb-6 leading-relaxed">
        Repeated violations were detected. Your vote has been automatically cast as <span className="text-red-400 font-bold">None of the Above (NOTA)</span>.
      </p>
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-5 sm:mb-6">
        <p className="text-xs text-gray-500 mb-1">Voter</p>
        <p className="text-base sm:text-lg font-semibold text-white">{voter?.name}</p>
        <p className="text-xs text-red-400 mt-2 font-medium">✗ NOTA — None of the Above</p>
      </div>
      <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
        <Shield size={11} /> Vote recorded securely on the blockchain
      </p>
    </div>
  </div>
);

// ─── Success Screen ───────────────────────────────────────────────────────────
const SuccessScreen = ({ voted, txHash }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
    <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border-2 border-green-300 p-6 sm:p-8 text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
        <CheckCircle className="w-9 h-9 sm:w-11 sm:h-11 text-green-600" />
      </div>
      <div className="text-xs font-bold uppercase tracking-widest text-green-600 mb-2">Vote Submitted</div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Vote Cast Successfully!</h2>
      <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-5">Your vote has been recorded.</p>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 border border-blue-200 mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">You voted for</p>
        <p className="text-lg sm:text-xl font-bold text-blue-700">{voted?.name}</p>
        <p className="text-sm text-gray-500 mt-1">{voted?.party || 'Independent'}</p>
        {voted?.ward_name && <p className="text-xs text-gray-400 mt-1">{voted.ward_name}</p>}
      </div>
      {txHash && (
        <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 mb-4">
          <p className="text-xs text-gray-400 mb-1">Blockchain Tx</p>
          <p className="text-xs font-mono text-gray-600 break-all">{txHash}</p>
        </div>
      )}
      <div className="flex items-center justify-center gap-2 text-green-600 text-xs sm:text-sm font-medium">
        <CheckCircle size={14} />
        <span>Verified & Secured</span>
        <Shield size={14} />
      </div>
      <p className="text-xs text-gray-400 mt-3">You may safely close this window.</p>
    </div>
  </div>
);

const CandidateCard = ({ candidate, onVote, disabled }) => (
  <div className={`w-full bg-white border-2 rounded-2xl p-4 sm:p-5 transition-all group
    ${disabled ? 'border-gray-200 opacity-60 cursor-not-allowed' : 'border-gray-200 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-50 cursor-pointer'}`}
  >
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-md shrink-0 overflow-hidden">
        {candidate.symbol ? (
          <img src={`http://localhost:5000${candidate.symbol}`} alt={candidate.name} className="w-full h-full object-cover" />
        ) : (
          candidate.name?.charAt(0).toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm sm:text-base truncate">{candidate.name}</p>
        <p className="text-xs sm:text-sm text-blue-600 font-medium">{candidate.party || 'Independent'}</p>
        {candidate.ward_name && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{candidate.ward_name} · Ward {candidate.ward_number}</p>
        )}
      </div>

      <button
        onClick={() => !disabled && onVote(candidate)}
        disabled={disabled}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all group-hover:shadow-md active:scale-95 flex-shrink-0"
      >
        Vote <ChevronRight size={13} />
      </button>
    </div>
  </div>
);

// ─── Voting Panel ─────────────────────────────────────────────────────────────
// const VotingPanel = ({ voter }) => {
//   const [candidates, setCandidates] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [voted, setVoted] = useState(null);
//   const [txHash, setTxHash] = useState(null);
//   const [notaTerminated, setNotaTerminated] = useState(false);

//   const [warningCount, setWarningCount] = useState(0);
//   const [showWarning, setShowWarning] = useState(false);
//   const warningCooldownRef = useRef(false);
//   const violationTimerRef = useRef(null);
//   const VIOLATION_GRACE_MS = 8000;

//   const audioState = useAudioMonitor(true);
//   const motionState = useMotionDetector(true);
//   const isEnvironmentUnsafe = audioState.isHighNoise || audioState.isHumanVoice || motionState.isMotionDetected;

//   const unsafeReasons = [
//     audioState.isHighNoise && 'background noise',
//     audioState.isHumanVoice && 'human voice',
//     motionState.isMotionDetected && 'motion nearby',
//   ].filter(Boolean).join(', ');

//   useEffect(() => {
//     if (!isEnvironmentUnsafe || warningCooldownRef.current || voted || notaTerminated || showWarning) return;
//     const nextWarning = warningCount + 1;
//     if (nextWarning <= 2) {
//       warningCooldownRef.current = true;
//       setWarningCount(nextWarning);
//       setShowWarning(true);
//     }
//   }, [isEnvironmentUnsafe]);

//   const handleDismissWarning = () => {
//     setShowWarning(false);
//     if (warningCount >= 2) {
//       violationTimerRef.current = setTimeout(() => {
//         setNotaTerminated(true);
//         castNOTA();
//       }, VIOLATION_GRACE_MS);
//     } else {
//       setTimeout(() => { warningCooldownRef.current = false; }, 5000);
//     }
//   };

//   useEffect(() => {
//     if (!isEnvironmentUnsafe && violationTimerRef.current) {
//       clearTimeout(violationTimerRef.current);
//       violationTimerRef.current = null;
//       warningCooldownRef.current = false;
//     }
//   }, [isEnvironmentUnsafe]);

//   useEffect(() => {
//     if (isEnvironmentUnsafe && warningCount === 2 && !showWarning && !notaTerminated && !voted) {
//       if (!violationTimerRef.current) {
//         violationTimerRef.current = setTimeout(() => {
//           setNotaTerminated(true);
//           castNOTA();
//         }, VIOLATION_GRACE_MS);
//       }
//     }
//   }, [isEnvironmentUnsafe, warningCount, showWarning]);

//   const castNOTA = async () => {
//     try { await voteService.castVote('NOTA'); } catch { }
//   };

//   useEffect(() => { fetchCandidates(); }, []);
//   useEffect(() => () => clearTimeout(violationTimerRef.current), []);

//   const fetchCandidates = async () => {
//     try {
//       setLoading(true);
//       const data = await voteService.getCandidatesForVoter();
//       setCandidates(data.candidates || []);
//     } catch {
//       setError('Failed to fetch candidates');
//       message.error('Failed to fetch candidates');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleVote = async (candidate) => {
//     if (isEnvironmentUnsafe) return;
//     try {
//       const result = await voteService.castVote(candidate.id);
//       setTxHash(result?.blockchain_hash || null);
//       setVoted(candidate);
//     } catch {
//       message.error('Failed to cast vote. Please try again.');
//     }
//   };

//   if (notaTerminated) return <NOTAScreen voter={voter} />;
//   if (voted) return <SuccessScreen voted={voted} txHash={txHash} />;

//   return (
//     // ✅ Extra bottom padding on mobile so floating camera doesn't overlap last candidate
//     <div className="min-h-screen bg-gray-50 px-3 sm:px-4 py-6 sm:py-10 pb-32 sm:pb-10">
//       {showWarning && <WarningOverlay warningCount={warningCount} reasons={unsafeReasons} onDismiss={handleDismissWarning} />}
//       <FloatingCamera audioState={audioState} motionState={motionState} />

//       <div className="max-w-xl mx-auto">
//         {/* Header */}
//         <div className="flex items-center gap-3 mb-4 sm:mb-6">
//           <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
//             <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
//           </div>
//           <div className="min-w-0">
//             <h1 className="text-base sm:text-xl font-bold text-gray-900">Cast Your Vote</h1>
//             <p className="text-xs sm:text-sm text-gray-500 truncate">Welcome, {voter?.name}</p>
//           </div>
//           {warningCount > 0 && (
//             <div className={`ml-auto flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ${warningCount >= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
//               <AlertTriangle size={11} />
//               {warningCount}/2
//             </div>
//           )}
//         </div>

//         {/* Unsafe banner */}
//         {isEnvironmentUnsafe && !showWarning && (
//           <div className="flex items-start gap-2 sm:gap-3 bg-red-50 border border-red-200 rounded-2xl px-3 sm:px-4 py-3 mb-4 sm:mb-6 shadow-sm">
//             <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
//             <div>
//               <p className="text-xs sm:text-sm font-semibold text-red-700">
//                 Voting blocked — {unsafeReasons} detected
//                 {warningCount >= 2 && <span className="ml-2 text-red-900">⏳ Session ending soon…</span>}
//               </p>
//               <p className="text-xs text-red-600 mt-0.5">Ensure complete silence and no movement nearby.</p>
//             </div>
//           </div>
//         )}

//         {/* Candidates */}
//         <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
//           <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
//             <p className="text-sm sm:text-base font-bold text-gray-800">Select a Candidate</p>
//             <p className="text-xs text-gray-500 mt-0.5">Tap Vote to cast your ballot</p>
//           </div>
//           <div className="p-3 sm:p-4 space-y-3">
//             {loading && (
//               <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-400">
//                 <RefreshCw size={24} className="animate-spin mb-3 text-blue-400" />
//                 <p className="text-sm">Loading candidates…</p>
//               </div>
//             )}
//             {error && (
//               <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-red-400">
//                 <AlertTriangle size={24} className="mb-3" />
//                 <p className="text-sm">{error}</p>
//               </div>
//             )}
//             {!loading && !error && candidates.length === 0 && (
//               <div className="text-center py-12 sm:py-16 text-gray-400 text-sm">No candidates found for this ward.</div>
//             )}
//             {!loading && candidates.map(c => (
//               <CandidateCard key={c.id} candidate={c} onVote={handleVote} disabled={isEnvironmentUnsafe} />
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
const VotingPanel = ({ voter }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voted, setVoted] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [notaTerminated, setNotaTerminated] = useState(false);

  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const warningCooldownRef = useRef(false);
  const notaTimerRef = useRef(null);
  const unsafeHistoryRef = useRef([]);
  const MAX_HISTORY = 12; 
  const VIOLATION_GRACE_MS = 8000;

  const audioState = useAudioMonitor(true);
  const motionState = useMotionDetector(true);

  const rawAudioUnsafe = audioState.isHighNoise || audioState.isHumanVoice;
  const rawMotionUnsafe = motionState.isMotionDetected;
  const rawUnsafe = rawAudioUnsafe || rawMotionUnsafe;

  unsafeHistoryRef.current.push(rawUnsafe ? 1 : 0);
  if (unsafeHistoryRef.current.length > MAX_HISTORY) {
    unsafeHistoryRef.current.shift();
  }
  const unsafeCount = unsafeHistoryRef.current.reduce((a, b) => a + b, 0);
  const isEnvironmentUnsafe = (unsafeCount / MAX_HISTORY) >= 0.75;
  const [hasVoted, setHasVoted] = useState(false);

  const unsafeReasons = [
    rawAudioUnsafe && 'background noise',
    audioState.isHumanVoice && 'human voice',
    rawMotionUnsafe && 'motion nearby',
  ].filter(Boolean).join(', ');

  console.log({
    rawAudio: rawAudioUnsafe,
    rawMotion: rawMotionUnsafe,
    rawUnsafe,
    unsafeHistoryLength: unsafeHistoryRef.current.length,
    unsafeRatio: (unsafeCount / MAX_HISTORY).toFixed(2),
    isEnvironmentUnsafe,
    warningCount,
    notaTimerActive: !!notaTimerRef.current
  });

  useEffect(() => {
    if (!isEnvironmentUnsafe || warningCooldownRef.current || voted || notaTerminated || showWarning) return;

    const nextWarning = warningCount + 1;
    if (nextWarning <= 2) {
      warningCooldownRef.current = true;
      setWarningCount(nextWarning);
      setShowWarning(true);
      console.log(`⚠️ Warning ${nextWarning} triggered (debounced unsafe)`);
    }
  }, [isEnvironmentUnsafe, warningCount, showWarning, voted, notaTerminated]);

  useEffect(() => {
    if (voted || notaTerminated) return;

    if (isEnvironmentUnsafe && warningCount >= 2) {
      if (!notaTimerRef.current) {
        console.log('💥 FINAL WARNING - 8s NOTA countdown STARTED');
        notaTimerRef.current = setTimeout(async () => {
          console.log('🗳️ AUTO-CASTING NOTA - Session terminated');
          setNotaTerminated(true);
          await castNOTA();
        }, VIOLATION_GRACE_MS);
      }
    } else if (notaTimerRef.current) {
      console.log('✅ Environment safe - NOTA timer CANCELLED');
      clearTimeout(notaTimerRef.current);
      notaTimerRef.current = null;
    }

    return () => {
      if (notaTimerRef.current) {
        clearTimeout(notaTimerRef.current);
        notaTimerRef.current = null;
      }
    };
  }, [isEnvironmentUnsafe, warningCount, voted, notaTerminated]);

  const castNOTA = async () => {
    try {
      await voteService.castVote('NOTA');
    } catch (err) {
      console.error('NOTA cast failed:', err);
    }
  };

  const handleDismissWarning = () => {
    setShowWarning(false);
    
    if (warningCount < 2) {
      setTimeout(() => {
        warningCooldownRef.current = false;
      }, 5000);
    }
  };

  useEffect(() => { fetchCandidates(); }, []);

  useEffect(() => {
    return () => {
      if (notaTimerRef.current) {
        clearTimeout(notaTimerRef.current);
      }
    };
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const data = await voteService.getCandidatesForVoter();
      setCandidates(data.candidates || []);
    } catch (err) {
      if (err.hasVoted) {
        setHasVoted(true);
        setError(err.message);
        return;
      }
      setError('Failed to fetch candidates');
      message.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (candidate) => {
    if (isEnvironmentUnsafe) {
      message.error('Cannot vote in unsafe environment');
      return;
    }
    try {
      const result = await voteService.castVote(candidate.id);
      setTxHash(result?.blockchain_hash || null);
      setVoted(candidate);
    } catch {
      message.error('Failed to cast vote. Please try again.');
    }
  };

  if (notaTerminated) return <NOTAScreen voter={voter} />;
  if (voted) return <SuccessScreen voted={voted} txHash={txHash} />;

  if (hasVoted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border-2 border-red-300 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Vote Already Cast</h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            You have already completed your voting. One voter, one vote.
          </p>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border mb-6">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1 font-medium">Status</p>
            <p className="text-lg font-bold text-green-700">✓ Vote Recorded</p>
          </div>
          <p className="text-xs text-gray-500">
            Please close this window. Thank you for voting!
          </p>
        </div>
      </div>
    );
  }

  if (notaTerminated) return <NOTAScreen voter={voter} />;
  if (voted) return <SuccessScreen voted={voted} txHash={txHash} />;

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-4 py-6 sm:py-10 pb-32 sm:pb-10">
      {showWarning && (
        <WarningOverlay 
          warningCount={warningCount} 
          reasons={unsafeReasons} 
          onDismiss={handleDismissWarning} 
        />
      )}
      <FloatingCamera audioState={audioState} motionState={motionState} />

      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-gray-900">Cast Your Vote</h1>
            <p className="text-xs sm:text-sm text-gray-500 truncate">Welcome, {voter?.name}</p>
          </div>
          {warningCount > 0 && (
            <div className={`ml-auto flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ${
              warningCount >= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <AlertTriangle size={11} />
              {warningCount}/2
            </div>
          )}
        </div>

        {isEnvironmentUnsafe && !showWarning && (
          <div className="flex items-start gap-2 sm:gap-3 bg-red-50 border border-red-200 rounded-2xl px-3 sm:px-4 py-3 mb-4 sm:mb-6 shadow-sm">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-red-700">
                Voting blocked — {unsafeReasons} detected
                {warningCount >= 2 && <span className="ml-2 text-red-900">⏳ Session ending soon…</span>}
              </p>
              <p className="text-xs text-red-600 mt-0.5">Ensure complete silence and no movement nearby.</p>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <p className="text-sm sm:text-base font-bold text-gray-800">Select a Candidate</p>
            <p className="text-xs text-gray-500 mt-0.5">Tap Vote to cast your ballot</p>
          </div>
          <div className="p-3 sm:p-4 space-y-3">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-400">
                <RefreshCw size={24} className="animate-spin mb-3 text-blue-400" />
                <p className="text-sm">Loading candidates…</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-red-400">
                <AlertTriangle size={24} className="mb-3" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            {!loading && !error && candidates.length === 0 && (
              <div className="text-center py-12 sm:py-16 text-gray-400 text-sm">No candidates found for this ward.</div>
            )}
            {!loading && candidates.map(c => (
              <CandidateCard 
                key={c.id} 
                candidate={c} 
                onVote={handleVote} 
                disabled={isEnvironmentUnsafe} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Welcome Screen ───────────────────────────────────────────────────────────
const WelcomeScreen = ({ voter, onProceed }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-200 p-6 sm:p-8 text-center">
      <div className="flex justify-center mb-3 sm:mb-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-blue-100 rounded-full">
          <User className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
        </div>
      </div>
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Welcome, {voter?.name}</h1>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        Before proceeding, please ensure:
      </p>
      <div className="text-left space-y-2 mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
        {[
          'Your face is clearly visible on camera',
          'You are in complete silence',
          'No one else is around or behind you',
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onProceed}
        className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors text-sm sm:text-base"
      >
        Click to Vote
      </button>
    </div>
  </div>
);

// ─── Main VoterDashboard ──────────────────────────────────────────────────────
const VoterDashboard = () => {
  const voter = useSelector(state => state.votes.voter);
  const [showVoting, setShowVoting] = useState(false);
  const { permissions, allGranted, requestPermissions } = usePermissions();

  if (!showVoting) {
    return <WelcomeScreen voter={voter} onProceed={() => setShowVoting(true)} />;
  }

  if (!allGranted) {
    return <PermissionGate permissions={permissions} checking={permissions.checking} onRetry={requestPermissions} />;
  }

  return <VotingPanel voter={voter} />;
};

export default VoterDashboard;