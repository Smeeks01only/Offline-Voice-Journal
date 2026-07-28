import React, { useState, useEffect, useRef } from 'react';
import './WaveformPlayer.css';

export default function WaveformPlayer({ audioUrl }) {
  const [waveform, setWaveform] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);
  const waveformRef = useRef(null);
  
  const numBars = 120;

  useEffect(() => {
    let isCancelled = false;

    const generateWaveform = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const arrayBuffer = await response.arrayBuffer();
        
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        if (isCancelled) return;

        const rawData = audioBuffer.getChannelData(0);
        const segmentSize = Math.floor(rawData.length / numBars);
        
        const peaks = [];
        let maxPeak = 0;

        for (let i = 0; i < numBars; i++) {
          let start = i * segmentSize;
          let end = start + segmentSize;
          let segmentMax = 0;
          for (let j = start; j < end; j++) {
            const amplitude = Math.abs(rawData[j]);
            if (amplitude > segmentMax) {
              segmentMax = amplitude;
            }
          }
          peaks.push(segmentMax);
          if (segmentMax > maxPeak) maxPeak = segmentMax;
        }

        // Normalize
        const normalized = peaks.map(p => (maxPeak === 0 ? 0 : p / maxPeak));
        setWaveform(normalized);
        setLoading(false);
      } catch (err) {
        console.error('Failed to generate waveform', err);
        if (!isCancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    generateWaveform();

    return () => {
      isCancelled = true;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    if (!waveformRef.current || !audioRef.current || !duration) return;
    
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds === 0) return "0:00";
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (error) {
    return <audio controls src={audioUrl} className="fallback-player" />;
  }

  const progressPercent = duration > 0 ? currentTime / duration : 0;
  const activeBarIndex = Math.floor(progressPercent * numBars);

  const displayBars = loading 
    ? Array.from({ length: numBars }, () => 0.05) 
    : waveform;

  return (
    <div className="waveform-player card">
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      />
      
      <button 
        className="play-btn" 
        onClick={togglePlay}
        disabled={loading}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="7" y="5" width="3" height="14" rx="1"></rect>
            <rect x="14" y="5" width="3" height="14" rx="1"></rect>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="7 5 19 12 7 19 7 5"></polygon>
          </svg>
        )}
      </button>

      <div 
        className="waveform-container" 
        ref={waveformRef}
        onClick={handleSeek}
      >
        {displayBars.map((val, i) => {
          const heightPercent = Math.max(0.05, val) * 100;
          const isPlayed = i < activeBarIndex;
          
          return (
            <div 
              key={i} 
              className={`w-bar ${isPlayed ? 'played' : 'unplayed'} ${loading ? 'loading-bar' : ''}`} 
              style={{ height: `${heightPercent}%` }}
            />
          );
        })}
      </div>

      <div className="time-display">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
}
