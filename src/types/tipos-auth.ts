export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Appointment {
  id: string;
  userId: string;
  userName?: string;
  date: Date;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
}