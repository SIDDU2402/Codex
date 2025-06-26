
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code, AlertCircle } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  role: string | null;
}

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchUserProfile = async (userId: string, fallbackEmail?: string): Promise<UserProfile | null> => {
    try {
      // First attempt with user ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (!profileError && profile) {
        return profile as UserProfile;
      }
      
      // Fallback attempt with email if provided
      if (fallbackEmail) {
        const { data: emailProfile, error: emailError } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', fallbackEmail)
          .single();
          
        if (!emailError && emailProfile) {
          return emailProfile as UserProfile;
        }
      }
      
      console.error('Profile fetch error:', profileError);
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const handleSuccessfulLogin = async (): Promise<void> => {
    toast({
      title: "Welcome back!",
      description: "You have successfully signed in.",
    });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        navigate('/');
        return;
      }
      
      const profile = await fetchUserProfile(userId, email);
      
      if (profile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error in handleSuccessfulLogin:', error);
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Sign In Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          await handleSuccessfulLogin();
        }
      } else {
        const { error } = await signUp(email, password, fullName, username);
        if (error) {
          toast({
            title: "Sign Up Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account.",
          });
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Code className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">CodeExam Pro</h1>
          </div>
          <CardTitle className="text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-slate-300">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400"
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-300">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400"
                    placeholder="Choose a username"
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400"
                placeholder="Enter your email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400"
                placeholder="Enter your password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
