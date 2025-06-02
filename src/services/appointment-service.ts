import { firestore } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { Agendamento } from '@/types/tipos-auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const appointmentService = {
  async criarAgendamento(agendamento: Agendamento): Promise<void> {
    try {
      console.log('Criando agendamento:', agendamento);
      await addDoc(collection(firestore, 'appointments'), {
        ...agendamento,
        criadoEm: new Date(),
      });
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      throw new Error('Erro ao criar agendamento: ' + error.message);
    }
  },

  async obterAgendamentosUsuario(userId: string): Promise<Agendamento[]> {
    try {
      console.log('Buscando agendamentos para userId:', userId);
      const q = query(collection(firestore, 'appointments'), where('proprietarioId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm.toDate(),
      })) as Agendamento[];
    } catch (error: any) {
      console.error('Erro ao buscar agendamentos:', error);
      throw new Error('Erro ao buscar agendamentos: ' + error.message);
    }
  },

  async obterTodosAgendamentos(): Promise<Agendamento[]> {
    try {
      console.log('Buscando todos os agendamentos');
      const q = query(collection(firestore, 'appointments'), where('status', '==', 'pendente'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm.toDate(),
      })) as Agendamento[];
    } catch (error: any) {
      console.error('Erro ao buscar todos os agendamentos:', error);
      throw new Error('Erro ao buscar todos os agendamentos: ' + error.message);
    }
  },

  async cancelarAgendamento(agendamentoId: string): Promise<void> {
    try {
      console.log('Cancelando agendamento:', agendamentoId);
      const docRef = doc(firestore, 'appointments', agendamentoId);
      await updateDoc(docRef, { status: 'cancelado' });
    } catch (error: any) {
      console.error('Erro ao cancelar agendamento:', error);
      throw new Error('Erro ao cancelar agendamento: ' + error.message);
    }
  },

  async verificarDisponibilidade(data: Date, hora: string): Promise<boolean> {
    try {
      console.log('Verificando disponibilidade:', { data, hora });
      const q = query(
        collection(firestore, 'appointments'),
        where('data', '==', format(data, 'yyyy-MM-dd', { locale: ptBR })),
        where('hora', '==', hora),
        where('status', '==', 'pendente')
      );
      const snapshot = await getDocs(q);
      return snapshot.empty;
    } catch (error: any) {
      console.error('Erro ao verificar disponibilidade:', error);
      return false;
    }
  },
};