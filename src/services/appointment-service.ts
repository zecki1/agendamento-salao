import { firestore } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { Appointment } from '@/types/tipos-auth';

export const appointmentService = {
  async createAppointment(userId: string, date: Date, time: string, userName: string): Promise<void> {
    try {
      // Save to user-specific collection
      const userApptRef = await addDoc(collection(firestore, `users/${userId}/appointments`), {
        userId,
        date,
        time,
        status: 'pending',
        createdAt: new Date(),
      });

      // Save to global appointments collection
      await addDoc(collection(firestore, 'appointments'), {
        userId,
        userName,
        date,
        time,
        status: 'pending',
        userApptId: userApptRef.id,
        createdAt: new Date(),
      });
    } catch (error: any) {
      throw new Error('Erro ao criar agendamento: ' + error.message);
    }
  },

  async getUserAppointments(userId: string): Promise<Appointment[]> {
    try {
      const q = query(collection(firestore, `users/${userId}/appointments`));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Appointment[];
    } catch (error: any) {
      throw new Error('Erro ao buscar agendamentos: ' + error.message);
    }
  },

  async getAllAppointments(): Promise<Appointment[]> {
    try {
      const q = query(collection(firestore, 'appointments'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Appointment[];
    } catch (error: any) {
      throw new Error('Erro ao buscar todos os agendamentos: ' + error.message);
    }
  },

  async cancelAppointment(appointmentId: string, userId: string): Promise<void> {
    try {
      // Update user-specific appointment
      const userDocRef = doc(firestore, `users/${userId}/appointments/${appointmentId}`);
      await updateDoc(userDocRef, { status: 'cancelled' });

      // Update global appointment
      const globalQuery = query(
        collection(firestore, 'appointments'),
        where('userApptId', '==', appointmentId),
        where('userId', '==', userId)
      );
      const globalSnapshot = await getDocs(globalQuery);
      globalSnapshot.forEach(async (doc) => {
        await updateDoc(doc.ref, { status: 'cancelled' });
      });
    } catch (error: any) {
      throw new Error('Erro ao cancelar agendamento: ' + error.message);
    }
  },
};