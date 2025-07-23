import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  type: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Habit {
  id: string;
  name: string;
  target: number;
  current: number;
  streak: number;
  completedDates: string[];
  type: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Task operations
export const addTask = async (userId: string, taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'tasks'), {
    ...taskData,
    userId,
    createdAt: now,
    updatedAt: now
  });
  return docRef.id;
};

export const updateTask = async (taskId: string, updates: Partial<Task>) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
};

export const deleteTask = async (taskId: string) => {
  await deleteDoc(doc(db, 'tasks', taskId));
};

export const getUserTasks = (userId: string, callback: (tasks: Task[]) => void) => {
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', userId)
    // orderBy('createdAt', 'desc') - Temporarily removed to avoid index requirement
  );

  return onSnapshot(q, (querySnapshot) => {
    const tasks: Task[] = [];
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() } as Task);
    });
    callback(tasks);
  });
};

// Habit operations
export const addHabit = async (userId: string, habitData: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'habits'), {
    ...habitData,
    userId,
    createdAt: now,
    updatedAt: now
  });
  return docRef.id;
};

export const updateHabit = async (habitId: string, updates: Partial<Habit>) => {
  const habitRef = doc(db, 'habits', habitId);
  await updateDoc(habitRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
};

export const deleteHabit = async (habitId: string) => {
  await deleteDoc(doc(db, 'habits', habitId));
};

export const getUserHabits = (userId: string, callback: (habits: Habit[]) => void) => {
  const q = query(
    collection(db, 'habits'),
    where('userId', '==', userId)
    // orderBy('createdAt', 'desc') - Temporarily removed to avoid index requirement
  );

  return onSnapshot(q, (querySnapshot) => {
    const habits: Habit[] = [];
    querySnapshot.forEach((doc) => {
      habits.push({ id: doc.id, ...doc.data() } as Habit);
    });
    callback(habits);
  });
};
