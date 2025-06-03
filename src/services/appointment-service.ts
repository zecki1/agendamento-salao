import { firestore } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Agendamento } from '@/types/tipos-auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

export const appointmentService = {
  async criarAgendamento(agendamento: Agendamento): Promise<void> {
    try {
      console.log('Criando agendamento:', agendamento);
      await addDoc(collection(firestore, 'appointments'), {
        ...agendamento,
        criadoEm: Timestamp.fromDate(new Date()),
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
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          criadoEm: data.criadoEm && typeof data.criadoEm.toDate === 'function'
            ? data.criadoEm.toDate()
            : new Date(),
        } as Agendamento;
      });
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
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          criadoEm: data.criadoEm && typeof data.criadoEm.toDate === 'function'
            ? data.criadoEm.toDate()
            : new Date(),
        } as Agendamento;
      });
    } catch (error: any) {
      console.error('Erro ao buscar todos os agendamentos:', error);
      throw new Error('Erro ao buscar todos os agendamentos: ' + error.message);
    }
  },

  async atualizarAgendamento(agendamento: Agendamento): Promise<void> {
    try {
      console.log('Atualizando agendamento:', agendamento.id);
      if (!agendamento.id) {
        throw new Error('ID do agendamento é obrigatório');
      }
      const docRef = doc(firestore, 'appointments', agendamento.id);
      await updateDoc(docRef, {
        ...agendamento,
        atualizadoEm: Timestamp.fromDate(new Date()),
      });
    } catch (error: any) {
      console.error('Erro ao atualizar agendamento:', error);
      throw new Error('Erro ao atualizar agendamento: ' + error.message);
    }
  },

  async excluirAgendamento(agendamentoId: string): Promise<void> {
    try {
      console.log('Excluindo agendamento:', agendamentoId);
      const docRef = doc(firestore, 'appointments', agendamentoId);
      await deleteDoc(docRef);
    } catch (error: any) {
      console.error('Erro ao excluir agendamento:', error);
      throw new Error('Erro ao excluir agendamento: ' + error.message);
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
        where('status', '==', 'pendente'),
      );
      const snapshot = await getDocs(q);
      return snapshot.empty;
    } catch (error: any) {
      console.error('Erro ao verificar disponibilidade:', error);
      return false;
    }
  },
};