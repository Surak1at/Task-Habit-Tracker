"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Check, X, Calendar, Target, Trash2, Edit2, RotateCcw, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import * as FirestoreService from '@/lib/firestore';

// Update type definitions to use Firebase types
interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  type: string;
}

interface Habit {
  id: string;
  name: string;
  target: number;
  current: number;
  streak: number;
  completedDates: string[];
  type: string;
}

const TaskHabitTracker = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [activeTab, setActiveTab] = useState<string>('today');
  const [newTaskText, setNewTaskText] = useState<string>('');
  const [newHabitText, setNewHabitText] = useState<string>('');
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  const { currentUser, logout } = useAuth();

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  const todayDisplay = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Initialize with Firebase real-time data or sample data for offline mode
  useEffect(() => {
    if (currentUser) {
      // Set up real-time listeners for Firebase data
      const unsubscribeTasks = FirestoreService.getUserTasks(currentUser.uid, (firestoreTasks) => {
        const convertedTasks = firestoreTasks.map(task => ({
          id: task.id,
          text: task.text,
          completed: task.completed,
          date: task.date,
          type: task.type
        }));
        setTasks(convertedTasks);
      });

      const unsubscribeHabits = FirestoreService.getUserHabits(currentUser.uid, (firestoreHabits) => {
        const convertedHabits = firestoreHabits.map(habit => ({
          id: habit.id,
          name: habit.name,
          target: habit.target,
          current: habit.current,
          streak: habit.streak,
          completedDates: habit.completedDates,
          type: habit.type
        }));
        setHabits(convertedHabits);
      });

      return () => {
        unsubscribeTasks();
        unsubscribeHabits();
      };
    } else {
      // Show sample data when not logged in
      const sampleTasks = [
        { id: '1', text: 'ตรวจ email สำคัญ', completed: false, date: today, type: 'daily' },
        { id: '2', text: 'ทำรายงานประจำสัปดาห์', completed: false, date: today, type: 'work' },
        { id: '3', text: 'ซื้อของใช้ในบ้าน', completed: true, date: today, type: 'personal' }
      ];
      
      const sampleHabits = [
        { 
          id: '1', 
          name: 'ดื่มน้ำ 8 แก้ว', 
          target: 8, 
          current: 5, 
          streak: 7,
          completedDates: [],
          type: 'daily'
        },
        { 
          id: '2', 
          name: 'วิ่งออกกำลังกาย', 
          target: 3, 
          current: 2, 
          streak: 4,
          completedDates: [],
          type: 'weekly'
        },
        { 
          id: '3', 
          name: 'อ่านหนังสือ', 
          target: 1, 
          current: 1, 
          streak: 12,
          completedDates: [],
          type: 'daily'
        }
      ];

      setTasks(sampleTasks);
      setHabits(sampleHabits);
    }
  }, [today, currentUser]);

  // Task functions
  const addTask = async () => {
    if (newTaskText.trim()) {
      if (currentUser) {
        // Add to Firestore
        await FirestoreService.addTask(currentUser.uid, {
          text: newTaskText,
          completed: false,
          date: today,
          type: 'personal'
        });
      } else {
        // Add locally (offline mode)
        const newTask: Task = {
          id: Date.now().toString(),
          text: newTaskText,
          completed: false,
          date: today,
          type: 'personal'
        };
        setTasks([...tasks, newTask]);
      }
      setNewTaskText('');
    }
  };

  const toggleTask = async (id: string) => {
    if (currentUser) {
      const task = tasks.find(t => t.id === id);
      if (task) {
        await FirestoreService.updateTask(id, { completed: !task.completed });
      }
    } else {
      setTasks(tasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      ));
    }
  };

  const deleteTask = async (id: string) => {
    if (currentUser) {
      await FirestoreService.deleteTask(id);
    } else {
      setTasks(tasks.filter(task => task.id !== id));
    }
  };

  const updateTask = async (id: string, newText: string) => {
    if (currentUser) {
      await FirestoreService.updateTask(id, { text: newText });
    } else {
      setTasks(tasks.map(task => 
        task.id === id ? { ...task, text: newText } : task
      ));
    }
    setEditingTask(null);
  };

  // Habit functions
  const addHabit = async () => {
    if (newHabitText.trim()) {
      if (currentUser) {
        // Add to Firestore
        await FirestoreService.addHabit(currentUser.uid, {
          name: newHabitText,
          target: 1,
          current: 0,
          streak: 0,
          completedDates: [],
          type: 'daily'
        });
      } else {
        // Add locally (offline mode)
        const newHabit: Habit = {
          id: Date.now().toString(),
          name: newHabitText,
          target: 1,
          current: 0,
          streak: 0,
          completedDates: [],
          type: 'daily'
        };
        setHabits([...habits, newHabit]);
      }
      setNewHabitText('');
    }
  };

  const updateHabitProgress = async (id: string, increment: boolean = true) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const newCurrent = increment 
      ? Math.min(habit.current + 1, habit.target)
      : Math.max(habit.current - 1, 0);
    
    const isCompleted = newCurrent >= habit.target;
    const wasCompleted = habit.current >= habit.target;
    
    let newStreak = habit.streak;
    if (isCompleted && !wasCompleted) {
      newStreak += 1;
    } else if (!isCompleted && wasCompleted) {
      newStreak = Math.max(0, newStreak - 1);
    }

    const updates = {
      current: newCurrent,
      streak: newStreak
    };

    if (currentUser) {
      await FirestoreService.updateHabit(id, updates);
    } else {
      setHabits(habits.map(habit => 
        habit.id === id ? { ...habit, ...updates } : habit
      ));
    }
  };

  const resetHabit = async (id: string) => {
    if (currentUser) {
      await FirestoreService.updateHabit(id, { current: 0 });
    } else {
      setHabits(habits.map(habit => 
        habit.id === id ? { ...habit, current: 0 } : habit
      ));
    }
  };

  const deleteHabit = async (id: string) => {
    if (currentUser) {
      await FirestoreService.deleteHabit(id);
    } else {
      setHabits(habits.filter(habit => habit.id !== id));
    }
  };

  const updateHabit = async (id: string, newName: string, newTarget: string | number) => {
    const updates = {
      name: newName,
      target: parseInt(newTarget.toString()) || 1
    };

    if (currentUser) {
      await FirestoreService.updateHabit(id, updates);
    } else {
      setHabits(habits.map(habit => 
        habit.id === id ? { ...habit, ...updates } : habit
      ));
    }
    setEditingHabit(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setTasks([]);
      setHabits([]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Stats
  const todayTasks = tasks.filter(task => task.date === today);
  const completedTasks = todayTasks.filter(task => task.completed);
  const completedHabits = habits.filter(habit => habit.current >= habit.target);
  const taskCompletionRate = todayTasks.length > 0 ? Math.round((completedTasks.length / todayTasks.length) * 100) : 0;
  const habitCompletionRate = habits.length > 0 ? Math.round((completedHabits.length / habits.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          {/* User Authentication Section */}
          <div className="flex justify-end mb-4">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600">{currentUser.displayName || currentUser.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200"
              >
                <User className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
              </button>
            )}
          </div>

          {/* Main Title - Perfectly Centered */}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Daily Tracker
          </h1>
          
          {/* Date Display */}
          <p className="text-gray-600 text-lg mb-4">{todayDisplay}</p>
          
          {/* Offline Mode Notice */}
          {!currentUser && (
            <div className="max-w-lg mx-auto p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                คุณกำลังใช้งานในโหมดออฟไลน์ เข้าสู่ระบบเพื่อซิงค์ข้อมูลระหว่างอุปกรณ์
              </p>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">งานวันนี้</p>
                <p className="text-2xl font-bold text-gray-900">{completedTasks.length}/{todayTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${taskCompletionRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{taskCompletionRate}% เสร็จแล้ว</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">นิสัยดี</p>
                <p className="text-2xl font-bold text-gray-900">{completedHabits.length}/{habits.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${habitCompletionRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{habitCompletionRate}% สำเร็จ</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Streak เฉลี่ย</p>
                <p className="text-2xl font-bold text-gray-900">
                  {habits.length > 0 ? Math.round(habits.reduce((sum, habit) => sum + habit.streak, 0) / habits.length) : 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <div className="text-orange-600 font-bold text-lg">🔥</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-6">วันต่อเนื่อง</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-2xl p-1 shadow-lg border border-gray-100">
            <div className="flex">
              {[
                { key: 'today', label: 'งานวันนี้', icon: Calendar },
                { key: 'habits', label: 'นิสัยดี', icon: Target }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === key
                      ? 'bg-indigo-500 text-white shadow-lg'
                      : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks Tab */}
        {activeTab === 'today' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">งานที่ต้องทำวันนี้</h2>
              
              {/* Add Task Input */}
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  placeholder="เพิ่มงานใหม่..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={addTask}
                  className="px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors duration-200 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่ม</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {todayTasks.map((task) => (
                <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        task.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {task.completed && <Check className="w-4 h-4" />}
                    </button>
                    
                    {editingTask === task.id ? (
                      <input
                        type="text"
                        defaultValue={task.text}
                        onBlur={(e) => updateTask(task.id, (e.target as HTMLInputElement).value)}
                        onKeyPress={(e) => e.key === 'Enter' && updateTask(task.id, (e.target as HTMLInputElement).value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    ) : (
                      <span
                        className={`flex-1 ${
                          task.completed ? 'line-through text-gray-400' : 'text-gray-900'
                        }`}
                      >
                        {task.text}
                      </span>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingTask(task.id)}
                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors duration-200"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {todayTasks.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>ยังไม่มีงานสำหรับวันนี้</p>
                  <p className="text-sm">เพิ่มงานใหม่เพื่อเริ่มต้น</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Habits Tab */}
        {activeTab === 'habits' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">นิสัยที่ดี</h2>
              
              {/* Add Habit Input */}
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newHabitText}
                  onChange={(e) => setNewHabitText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addHabit()}
                  placeholder="เพิ่มนิสัยใหม่..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={addHabit}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors duration-200 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่ม</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {habits.map((habit) => (
                <div key={habit.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  {editingHabit === habit.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        defaultValue={habit.name}
                        onBlur={(e) => updateHabit(habit.id, (e.target as HTMLInputElement).value, habit.target)}
                        onKeyPress={(e) => e.key === 'Enter' && updateHabit(habit.id, (e.target as HTMLInputElement).value, habit.target)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        autoFocus
                      />
                      <input
                        type="number"
                        defaultValue={habit.target}
                        onBlur={(e) => updateHabit(habit.id, habit.name, (e.target as HTMLInputElement).value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        min="1"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">{habit.name}</h3>
                          <span className="text-sm text-gray-500">
                            {habit.current}/{habit.target}
                          </span>
                          <div className="flex items-center space-x-1 text-orange-500">
                            <span className="text-lg">🔥</span>
                            <span className="text-sm font-medium">{habit.streak}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingHabit(habit.id)}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors duration-200"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => resetHabit(habit.id)}
                            className="p-2 text-gray-400 hover:text-orange-600 transition-colors duration-200"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteHabit(habit.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ${
                              habit.current >= habit.target ? 'bg-green-500' : 'bg-green-400'
                            }`}
                            style={{ width: `${Math.min((habit.current / habit.target) * 100, 100)}%` }}
                          ></div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateHabitProgress(habit.id, false)}
                              disabled={habit.current <= 0}
                              className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateHabitProgress(habit.id, true)}
                              disabled={habit.current >= habit.target}
                              className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="text-sm text-gray-500">
                            {habit.current >= habit.target && (
                              <span className="text-green-600 font-medium">✅ เสร็จแล้ว!</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              {habits.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>ยังไม่มีนิสัยที่ต้องติดตาม</p>
                  <p className="text-sm">เพิ่มนิสัยใหม่เพื่อเริ่มต้น</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand Section */}
            <div className="text-center md:text-left">
              <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Daily Tracker
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                ติดตามงานและพัฒนานิสัยดีของคุณอย่างง่ายดาย
              </p>
              <div className="flex justify-center md:justify-start space-x-1">
                <span className="text-lg">🎯</span>
                <span className="text-lg">✅</span>
                <span className="text-lg">🔥</span>
              </div>
            </div>

            {/* Features Section */}
            <div className="text-center">
              <h4 className="font-semibold text-gray-900 mb-3">ฟีเจอร์</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center justify-center space-x-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>จัดการงานประจำวัน</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <Target className="w-4 h-4 text-green-500" />
                  <span>ติดตามนิสัยดี</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <div className="text-orange-500 text-sm">🔥</div>
                  <span>สร้าง Streak ต่อเนื่อง</span>
                </li>
              </ul>
            </div>

            {/* Sync Status Section */}
            <div className="text-center md:text-right">
              <h4 className="font-semibold text-gray-900 mb-3">สถานะ</h4>
              <div className="space-y-2">
                {currentUser ? (
                  <div className="flex items-center justify-center md:justify-end space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600">ซิงค์แล้ว</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center md:justify-end space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-sm text-yellow-600">โหมดออฟไลน์</span>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {currentUser ? 'ข้อมูลจะซิงค์อัตโนมัติ' : 'เข้าสู่ระบบเพื่อซิงค์ข้อมูล'}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
              <div className="text-xs text-gray-500">
                © 2025 Daily Tracker. Generated by Hurray Surakiat.
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                  <span>เวอร์ชัน 1.0</span>
                </span>
                <span>|</span>
                <span>{new Date().getFullYear()}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default TaskHabitTracker;