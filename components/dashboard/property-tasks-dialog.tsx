'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

type Task = {
  id: string;
  task: string;
  completed: boolean;
  order: number;
};

type PropertyTasksDialogProps = {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function PropertyTasksDialog({ propertyId, open, onOpenChange }: PropertyTasksDialogProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && propertyId) {
      loadTasks();
    }
  }, [open, propertyId]);

  const loadTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('property_tasks')
      .select('*')
      .eq('property_id', propertyId)
      .order('order', { ascending: true });

    if (error) {
      toast.error('Failed to load tasks');
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const { error } = await supabase
      .from('property_tasks')
      .insert({
        property_id: propertyId,
        task: newTask.trim(),
        order: tasks.length,
        completed: false,
      });

    if (error) {
      toast.error('Failed to add task');
    } else {
      setNewTask('');
      loadTasks();
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from('property_tasks')
      .update({ completed: !completed })
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to update task');
    } else {
      loadTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('property_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to delete task');
    } else {
      toast.success('Task deleted');
      loadTasks();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Property Checklist</DialogTitle>
          <DialogDescription>
            Manage tasks and requirements for this property
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddTask} className="flex gap-2">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </form>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <p className="text-center py-4 text-slate-500">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-center py-4 text-slate-500">No tasks yet. Add your first task above.</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => handleToggleComplete(task.id, task.completed)}
                />
                <span className={`flex-1 ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {task.task}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTask(task.id)}
                >
                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
