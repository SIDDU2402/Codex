
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, Code, Users, Trophy, ChevronRight } from "lucide-react";
import ExamInterface from "./ExamInterface";

const Index = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'exam'>('landing');

  const contests = [
    {
      id: 1,
      title: "Spring Coding Challenge 2024",
      description: "Test your algorithmic skills in this comprehensive coding challenge",
      duration: "3 hours",
      participants: 245,
      difficulty: "Medium",
      status: "Active",
      problems: 5
    },
    {
      id: 2,
      title: "Technical Interview Prep",
      description: "Practice common interview questions from top tech companies",
      duration: "2 hours",
      participants: 89,
      difficulty: "Hard",
      status: "Starting Soon",
      problems: 3
    }
  ];

  if (currentView === 'exam') {
    return <ExamInterface onBack={() => setCurrentView('landing')} />;
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
              <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                Sign In
              </Button>
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
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {contests.map((contest) => (
              <Card key={contest.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 hover:scale-105">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-lg mb-2">{contest.title}</CardTitle>
                      <p className="text-slate-300 text-sm">{contest.description}</p>
                    </div>
                    <Badge 
                      variant={contest.status === 'Active' ? 'default' : 'secondary'}
                      className={contest.status === 'Active' ? 'bg-green-500 hover:bg-green-600' : ''}
                    >
                      {contest.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Timer className="h-4 w-4" />
                        <span>{contest.duration}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{contest.participants}</span>
                      </div>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {contest.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{contest.problems} Problems</span>
                    <Button 
                      onClick={() => setCurrentView('exam')}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      disabled={contest.status !== 'Active'}
                    >
                      {contest.status === 'Active' ? 'Join Contest' : 'Starting Soon'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
