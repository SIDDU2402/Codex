
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, Users, Trophy, ChevronRight, LogOut, Timer } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useContests } from '@/hooks/useContests';
import ContestCard from '@/components/ContestCard';
import ExamInterface from "./ExamInterface";

const Index = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'exam'>('landing');
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: contests, isLoading, error } = useContests();

  const handleSignOut = async () => {
    await signOut();
    setCurrentView('landing');
  };

  const handleJoinContest = (contestId: string) => {
    setSelectedContestId(contestId);
    setCurrentView('exam');
  };

  if (currentView === 'exam' && selectedContestId) {
    return <ExamInterface contestId={selectedContestId} onBack={() => setCurrentView('landing')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Code className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">CodeExam Pro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Dashboard
              </Button>
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Leaderboard
              </Button>
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-slate-300">Welcome back!</span>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:text-white"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => navigate('/auth')}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Professional Coding
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400"> Assessments</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            Host competitive programming rounds, technical interviews, and coding challenges with our immersive platform designed for colleges, companies, and coding clubs.
          </p>
          <div className="flex items-center justify-center space-x-6 text-slate-400">
            <div className="flex items-center space-x-2">
              <Timer className="h-5 w-5" />
              <span>Timed Contests</span>
            </div>
            <div className="flex items-center space-x-2">
              <Code className="h-5 w-5" />
              <span>Live Code Editor</span>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Real-time Leaderboard</span>
            </div>
          </div>
        </div>

        {/* Active Contests */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Active Contests</h2>
          {isLoading ? (
            <div className="text-center text-slate-400">Loading contests...</div>
          ) : error ? (
            <div className="text-center text-red-400">Failed to load contests</div>
          ) : contests && contests.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {contests.map((contest) => (
                <ContestCard
                  key={contest.id}
                  contest={contest}
                  participantCount={0} // TODO: Add participant count query
                  onJoin={handleJoinContest}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400">No active contests available</div>
          )}
        </div>

        {/* Features Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-12">Platform Features</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Code className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Live Code Editor</h3>
              <p className="text-slate-400">Professional coding environment with syntax highlighting and real-time execution</p>
            </div>
            <div className="text-center p-6">
              <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Timer className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Timed Assessments</h3>
              <p className="text-slate-400">Built-in timers with automatic submission and contest scheduling</p>
            </div>
            <div className="text-center p-6">
              <div className="h-16 w-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Live Leaderboard</h3>
              <p className="text-slate-400">Real-time rankings with scoring system and performance analytics</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
