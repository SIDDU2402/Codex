import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateContest } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const CreateContestForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    duration_minutes: 180, // 3 hours default
    max_participants: '',
  });

  const createContest = useCreateContest();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Contest title is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.start_time) {
      toast({
        title: "Validation Error",
        description: "Start time is required.",
        variant: "destructive",
      });
      return;
    }

    // Check if start time is in the future
    const startTime = new Date(formData.start_time);
    const now = new Date();
    if (startTime <= now) {
      toast({
        title: "Validation Error",
        description: "Contest start time must be in the future.",
        variant: "destructive",
      });
      return;
    }

    if (formData.duration_minutes < 30) {
      toast({
        title: "Validation Error",
        description: "Contest duration must be at least 30 minutes.",
        variant: "destructive",
      });
      return;
    }
    
    const contestData = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      start_time: formData.start_time,
      duration_minutes: formData.duration_minutes,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined,
    };

    try {
      await createContest.mutateAsync(contestData);
      // Reset form on success
      setFormData({
        title: '',
        description: '',
        start_time: '',
        duration_minutes: 180,
        max_participants: '',
      });
      // Refresh the contest list
      queryClient.invalidateQueries({ queryKey: ['admin-contests'] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
    } catch (error) {
      console.error('Contest creation failed:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration_minutes' ? parseInt(value) || 0 : value,
    }));
  };

  // Set minimum date-time to current time
  const now = new Date();
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <Card className="bg-slate-800 border-slate-700 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white">Create New Contest</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-slate-300">Contest Title *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter contest title"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-300">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter contest description (optional)"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time" className="text-slate-300">Start Time *</Label>
              <Input
                id="start_time"
                name="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={handleChange}
                required
                min={minDateTime}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="duration_minutes" className="text-slate-300">Duration (minutes) *</Label>
              <Input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                value={formData.duration_minutes}
                onChange={handleChange}
                required
                min="30"
                step="30"
                placeholder="180"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="max_participants" className="text-slate-300">Max Participants</Label>
            <Input
              id="max_participants"
              name="max_participants"
              type="number"
              value={formData.max_participants}
              onChange={handleChange}
              min="1"
              placeholder="Leave empty for unlimited"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>

          <Button
            type="submit"
            disabled={createContest.isPending}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
          >
            {createContest.isPending ? 'Creating Contest...' : 'Create Contest'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateContestForm;
