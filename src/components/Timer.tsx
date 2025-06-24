
import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";

interface TimerProps {
  duration: number; // in seconds
  onTimeUp?: () => void;
}

const Timer = ({ duration, onTimeUp }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeUp?.();
          return 0;
        }
        
        // Show warning when less than 10 minutes left
        if (prev <= 600 && !isWarning) {
          setIsWarning(true);
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeUp, isWarning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft <= 300) return 'text-red-400'; // 5 minutes - critical
    if (timeLeft <= 600) return 'text-yellow-400'; // 10 minutes - warning
    return 'text-green-400'; // normal
  };

  const getBackgroundColor = () => {
    if (timeLeft <= 300) return 'bg-red-500'; // critical
    if (timeLeft <= 600) return 'bg-yellow-500'; // warning
    return 'bg-green-500'; // normal
  };

  return (
    <div className="flex items-center space-x-2">
      {isWarning && (
        <AlertTriangle className="h-4 w-4 text-yellow-400 animate-pulse" />
      )}
      <Clock className="h-4 w-4 text-slate-300" />
      <Badge className={`${getBackgroundColor()} text-white font-mono text-sm px-3 py-1`}>
        {formatTime(timeLeft)}
      </Badge>
      {timeLeft <= 300 && (
        <span className="text-xs text-red-400 animate-pulse">
          Time Running Out!
        </span>
      )}
    </div>
  );
};

export default Timer;
