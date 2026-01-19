
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CameraModalProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }

      const track = s.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      if (capabilities && capabilities.torch) {
        setHasFlash(true);
      }

      // Show tutorial if first time
      const hasSeenTutorial = localStorage.getItem('camera_tutorial_seen');
      if (!hasSeenTutorial) {
        setTutorialStep(0);
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Please allow camera access to scan math problems.");
    }
  };

  const toggleFlash = async () => {
    if (!stream || !hasFlash) return;
    const track = stream.getVideoTracks()[0];
    try {
      const newState = !isFlashOn;
      await track.applyConstraints({
        advanced: [{ torch: newState }] as any
      });
      setIsFlashOn(newState);
    } catch (err) {
      console.error("Failed to toggle flash", err);
    }
  };

  const performCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const base64 = dataUrl.split(',')[1];
        
        setIsFlashing(true);
        setTimeout(() => {
          setIsFlashing(false);
          onCapture(base64);
          stream?.getTracks().forEach(track => track.stop());
        }, 150);
      }
    }
  }, [onCapture, stream]);

  const startCountdown = () => {
    if (countdown !== null || tutorialStep !== null) return;
    setCountdown(3);
  };

  const nextTutorial = () => {
    if (tutorialStep === 2) {
      setTutorialStep(null);
      localStorage.setItem('camera_tutorial_seen', 'true');
    } else if (tutorialStep !== null) {
      setTutorialStep(tutorialStep + 1);
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      performCapture();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, performCapture]);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const tutorialSteps = [
    {
      title: "Perfect Alignment",
      desc: "Fit the entire math problem inside the blue corners. Keep your phone level for the best results.",
      icon: "fa-expand",
      target: "frame"
    },
    {
      title: "Lighting Matters",
      desc: "In dim areas, use the flash toggle to brighten your paper. Clear lighting leads to faster solutions.",
      icon: "fa-lightbulb",
      target: "flash"
    },
    {
      title: "Stay Steady",
      desc: "Tapping the shutter starts a 3-second timer. Use this time to hold your hand still for a blur-free shot.",
      icon: "fa-hand-pointer",
      target: "shutter"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden font-['Outfit']">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className={`w-full h-full object-cover transition-transform duration-300 ${isFlashing ? 'scale-95' : 'scale-100'}`} 
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {isFlashing && (
        <div className="absolute inset-0 bg-white z-[60] animate-pulse" />
      )}

      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 backdrop-blur-[2px]">
          <div className="text-white text-9xl font-black animate-ping drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">
            {countdown}
          </div>
        </div>
      )}
      
      {/* Controls HUD */}
      <div className="absolute bottom-10 flex gap-6 items-center z-20">
        <button 
          onClick={onClose}
          className="bg-white/20 hover:bg-white/40 text-white p-4 rounded-full backdrop-blur-md transition-colors"
          disabled={countdown !== null || tutorialStep !== null}
        >
          <i className="fa-solid fa-xmark text-2xl"></i>
        </button>

        <button 
          id="shutter-btn"
          onClick={startCountdown}
          disabled={countdown !== null || tutorialStep !== null}
          className={`relative bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-full border-4 border-white shadow-xl transition-all ${countdown !== null ? 'opacity-50 scale-90' : 'hover:scale-110 active:scale-95'}`}
        >
          <i className="fa-solid fa-camera text-3xl"></i>
          {countdown !== null && (
             <div className="absolute inset-0 rounded-full border-4 border-white animate-ping opacity-75"></div>
          )}
        </button>

        {hasFlash && (
          <button 
            id="flash-btn"
            onClick={toggleFlash}
            className={`p-4 rounded-full backdrop-blur-md transition-all ${isFlashOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white hover:bg-white/40'}`}
            disabled={countdown !== null || tutorialStep !== null}
          >
            <i className={`fa-solid fa-bolt${isFlashOn ? '' : '-slash'} text-2xl`}></i>
          </button>
        )}
      </div>

      <button 
        onClick={() => setTutorialStep(0)}
        className="absolute top-10 right-6 text-white/70 hover:text-white bg-black/40 p-2 rounded-full backdrop-blur-sm z-20 transition-all active:scale-90"
      >
        <i className="fa-solid fa-circle-info text-xl"></i>
      </button>
      
      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm z-20 font-medium whitespace-nowrap">
        {countdown !== null ? 'Hold steady...' : 'Align math problem in center'}
      </div>

      {/* Frame UI */}
      <div className="absolute inset-0 pointer-events-none border-[40px] border-black/30 z-0">
        <div id="capture-frame" className="w-full h-full border-2 border-white/20 rounded-lg relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-md shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-md shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-md shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-md shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
        </div>
      </div>

      {/* Interactive Tutorial Layer */}
      {tutorialStep !== null && (
        <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 transition-opacity animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-slate-900 shadow-2xl space-y-5 relative">
            <div className="bg-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-2">
              <i className={`fa-solid ${tutorialSteps[tutorialStep].icon} text-2xl`}></i>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-2xl font-bold tracking-tight">{tutorialSteps[tutorialStep].title}</h4>
              <p className="text-slate-500 leading-relaxed font-medium">
                {tutorialSteps[tutorialStep].desc}
              </p>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-slate-100">
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === tutorialStep ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`} />
                ))}
              </div>
              <button 
                onClick={nextTutorial}
                className="bg-slate-900 text-white px-7 py-3 rounded-2xl font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-md"
              >
                {tutorialStep === 2 ? 'Start Solving' : 'Next Tip'}
              </button>
            </div>
          </div>
          
          {/* Visual Focus Effects for Tutorial Targets */}
          {tutorialStep === 0 && (
            <div className="absolute inset-0 border-[60px] border-blue-500/30 pointer-events-none rounded-3xl animate-pulse" />
          )}
          {tutorialStep === 1 && (
            <div className="absolute bottom-10 right-[calc(50%-100px)] w-20 h-20 border-[6px] border-yellow-400 rounded-full animate-ping pointer-events-none opacity-50" />
          )}
          {tutorialStep === 2 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-28 h-28 border-[6px] border-blue-400 rounded-full animate-ping pointer-events-none opacity-50" />
          )}
        </div>
      )}
    </div>
  );
};
