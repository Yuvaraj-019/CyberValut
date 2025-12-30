import React, { useState, useEffect } from 'react';
import { Plus, CheckSquare, Square, Trash2, Calendar, Flag, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { todoService, TodoItem } from '../services/databaseService';
import { activityService } from '../services/databaseService';

// Update the Task interface to match TodoItem from databaseService
interface Task extends TodoItem {
  description: string;
  dueDate: string;
  category: string;
}

const TodoManager: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'title'>('date');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    dueDate: '',
    category: ''
  });

  // Load tasks from Firebase on mount and when user changes
  useEffect(() => {
    if (user) {
      loadTasks();
    } else {
      setTasks([]);
      setLoading(false);
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const firebaseTodos = await todoService.getTodos(user.uid);
      
      // Convert from TodoItem to Task format
      const convertedTasks: Task[] = firebaseTodos.map(todo => ({
        id: todo.id!,
        title: todo.title,
        description: '', // Add empty description for compatibility
        completed: todo.completed,
        priority: todo.priority,
        dueDate: '', // Add empty due date for compatibility
        category: '', // Add empty category for compatibility
        createdAt: todo.createdAt || { seconds: Date.now() / 1000, nanoseconds: 0 } as any
      }));
      
      setTasks(convertedTasks);
      
      // Log activity
      activityService.logActivity(user.uid, 'VIEWED_TODOS', {
        taskCount: convertedTasks.length
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
      // Fallback to localStorage if Firebase fails
      const savedTasks = localStorage.getItem('myspace-tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToFirebase = async (task: Omit<Task, 'id' | 'createdAt'>, taskId?: string) => {
    if (!user) return null;
    
    try {
      // Convert Task to TodoItem format
      const todoItem: Omit<TodoItem, 'id' | 'createdAt'> = {
        title: task.title,
        completed: task.completed,
        priority: task.priority
      };
      
      if (taskId) {
        // Update existing task
        await todoService.updateTodo(user.uid, taskId, todoItem);
        return taskId;
      } else {
        // Add new task
        const id = await todoService.addTodo(user.uid, todoItem);
        
        // Log activity
        activityService.logActivity(user.uid, 'ADDED_TODO', {
          taskId: id,
          title: task.title,
          priority: task.priority
        });
        
        return id;
      }
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please login to save tasks');
      return;
    }
    
    try {
      if (editingTask) {
        // Update task
        const updatedTask: Omit<Task, 'id' | 'createdAt'> = {
          ...formData,
          completed: editingTask.completed
        };
        
        await saveToFirebase(updatedTask, editingTask.id);
        
        // Update local state
        const updatedTasks = tasks.map(task => 
          task.id === editingTask.id 
            ? { 
                ...updatedTask, 
                id: editingTask.id, 
                createdAt: editingTask.createdAt 
              }
            : task
        );
        setTasks(updatedTasks);
        setEditingTask(null);
        
      } else {
        // Add new task
        const newTask: Omit<Task, 'id' | 'createdAt'> = {
          ...formData,
          completed: false
        };
        
        const taskId = await saveToFirebase(newTask);
        
        if (taskId) {
          // Add to local state
          const taskToAdd: Task = {
            ...newTask,
            id: taskId,
            createdAt: new Date().toISOString()
          };
          setTasks([taskToAdd, ...tasks]);
        }
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        category: ''
      });
      setIsAddingTask(false);
      
    } catch (error) {
      alert('Failed to save task. Please try again.');
    }
  };

  const toggleComplete = async (task: Task) => {
    if (!user) return;
    
    try {
      const updatedTask = { ...task, completed: !task.completed };
      
      // Update in Firebase
      await todoService.updateTodo(user.uid, task.id, {
        completed: updatedTask.completed
      });
      
      // Update local state
      setTasks(tasks.map(t => 
        t.id === task.id ? updatedTask : t
      ));
      
      // Log activity
      activityService.logActivity(user.uid, updatedTask.completed ? 'COMPLETED_TODO' : 'UNCOMPLETED_TODO', {
        taskId: task.id,
        title: task.title
      });
      
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      // Delete from Firebase
      await todoService.deleteTodo(user.uid, taskId);
      
      // Delete from local state
      setTasks(tasks.filter(task => task.id !== taskId));
      
      // Log activity
      activityService.logActivity(user.uid, 'DELETED_TODO', {
        taskId: taskId
      });
      
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate || '',
      category: task.category || ''
    });
    setIsAddingTask(true);
  };

  // Filtering and sorting logic remains the same
  const filteredTasks = tasks
    .filter(task => {
      if (filter === 'active') return !task.completed;
      if (filter === 'completed') return task.completed;
      return true;
    })
    .filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      // Sort by creation date (Firebase timestamp)
      const dateA = a.createdAt instanceof Object && 'seconds' in a.createdAt 
        ? a.createdAt.seconds * 1000 
        : new Date(a.createdAt).getTime();
      const dateB = b.createdAt instanceof Object && 'seconds' in b.createdAt 
        ? b.createdAt.seconds * 1000 
        : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'text-red-600 bg-red-50',
      medium: 'text-yellow-600 bg-yellow-50',
      low: 'text-green-600 bg-green-50'
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;

  if (loading && user) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Task Manager</h1>
            <p className="text-gray-600 text-sm sm:text-base">Loading your tasks...</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-48 sm:h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 xs:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Task Manager</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {user ? 'Stay organized and track your progress' : 'Please login to manage tasks'}
          </p>
        </div>
        {user && (
          <button
            onClick={() => setIsAddingTask(true)}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2 min-h-[44px] min-w-[44px]"
            aria-label="Add Task"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Task</span>
          </button>
        )}
      </div>

      {user ? (
        <>
          {/* Stats - UPDATED RESPONSIVE GRID */}
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600">Total Tasks</p>
              <p className="text-xl sm:text-2xl font-bold">{totalTasks}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600">Completed</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{completedTasks}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600">Remaining</p>
              <p className="text-xl sm:text-2xl font-bold">{totalTasks - completedTasks}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600">Progress</p>
              <p className="text-xl sm:text-2xl font-bold">
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
              </p>
            </div>
          </div>

          {/* Controls - UPDATED FOR MOBILE */}
          <div className="flex flex-col xs:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
              />
            </div>
            <div className="flex space-x-1 sm:space-x-2">
              {['all', 'active', 'completed'].map(filterType => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType as any)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm min-h-[44px] min-w-[44px] ${
                    filter === filterType
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="hidden xs:inline">
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  </span>
                  <span className="xs:hidden uppercase">
                    {filterType.charAt(0)}
                  </span>
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base min-h-[44px]"
            >
              <option value="date">Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
          </div>

          {/* Add/Edit Form - UPDATED RESPONSIVE GRID */}
          {isAddingTask && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                    rows={2}
                    placeholder="Task description..."
                  />
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Priority *</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as Task['priority']})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                    />
                  </div>
                  <div className="xs:col-span-2 md:col-span-1">
                    <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                      placeholder="e.g., Work, Personal"
                    />
                  </div>
                </div>
                <div className="flex space-x-2 sm:space-x-4 pt-2">
                  <button
                    type="submit"
                    className="bg-black text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors flex-1 sm:flex-none min-h-[44px]"
                  >
                    {editingTask ? 'Update Task' : 'Add Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTask(false);
                      setEditingTask(null);
                      setFormData({
                        title: '',
                        description: '',
                        priority: 'medium',
                        dueDate: '',
                        category: ''
                      });
                    }}
                    className="bg-gray-100 text-gray-700 px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors flex-1 sm:flex-none min-h-[44px]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tasks List - UPDATED FOR MOBILE */}
          <div className="space-y-3 sm:space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <CheckSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 text-sm sm:text-base">No tasks found. Add your first task to get started.</p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <div key={task.id} className={`bg-white border border-gray-200 rounded-lg p-4 sm:p-6 ${task.completed ? 'opacity-75' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 sm:space-x-4 flex-1">
                      <button
                        onClick={() => toggleComplete(task)}
                        className={`mt-0.5 sm:mt-1 transition-colors min-h-[44px] min-w-[44px] ${task.completed ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                        aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                      >
                        {task.completed ? <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" /> : <Square className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-1 sm:mb-2 gap-1 sm:gap-0">
                          <h3 className={`text-base sm:text-lg font-semibold truncate ${task.completed ? 'line-through text-gray-500' : ''}`}>
                            {task.title}
                          </h3>
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            <span className={`px-2 py-0.5 sm:py-1 rounded-full text-xs ${getPriorityColor(task.priority)} whitespace-nowrap`}>
                              <Flag className="w-2 h-2 sm:w-3 sm:h-3 inline mr-0.5 sm:mr-1" />
                              {task.priority}
                            </span>
                            {task.category && (
                              <span className="px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded-full text-xs whitespace-nowrap">
                                {task.category}
                              </span>
                            )}
                          </div>
                        </div>
                        {task.description && (
                          <p className={`text-gray-600 mb-1 sm:mb-2 text-sm sm:text-base line-clamp-2 ${task.completed ? 'line-through' : ''}`}>
                            {task.description}
                          </p>
                        )}
                        {task.dueDate && (
                          <div className={`flex items-center space-x-1 text-xs sm:text-sm ${
                            isOverdue(task.dueDate) && !task.completed ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            {isOverdue(task.dueDate) && !task.completed && (
                              <span className="text-red-600 font-medium">(Overdue)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 ml-2">
                      <button
                        onClick={() => startEdit(task)}
                        className="p-1 sm:p-2 text-gray-600 hover:text-black transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">Edit</span>
                        <span className="sm:hidden">✏️</span>
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 sm:p-2 text-gray-600 hover:text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
          <CheckSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Login Required</h3>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Please login to access your task manager.</p>
          <p className="text-xs sm:text-sm text-gray-500">Your tasks will be securely stored in your personal account.</p>
        </div>
      )}
    </div>
  );
};

export default TodoManager;