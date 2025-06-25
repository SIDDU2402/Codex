
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateContest } from '@/hooks/useAdmin';

const CreateContestForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    duration_minutes: 180, // 3 hours default
    max_participants: '',
  });

  const createContest = useCreateContest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const contestData = {
      title: formData.title,
      description: formData.description || undefined,
      start_time: formData.start_time,
      duration_minutes: formData.duration_minutes,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined,
    };

    createContest.mutate(contestData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration_minutes' ? parseInt(value) || 0 : value,
    }));
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Create New Contest</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-slate-300">Contest Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-300">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time" className="text-slate-300">Start Time</Label>
              <Input
                id="start_time"
                name="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={handleChange}
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="duration_minutes" className="text-slate-300">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                value={formData.duration_minutes}
                onChange={handleChange}
                required
                min="30"
                step="30"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="max_participants" className="text-slate-300">Max Participants (Optional)</Label>
            <Input
              id="max_participants"
              name="max_participants"
              type="number"
              value={formData.max_participants}
              onChange={handleChange}
              min="1"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <Button
            type="submit"
            disabled={createContest.isPending}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            {createContest.isPending ? 'Creating...' : 'Create Contest'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateContestForm;
