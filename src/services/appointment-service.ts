import { firestore } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc, orderBy } from 'firebase/firestore';
import { Agendamento } from '@/types/tipos-auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

export const appointmentService = {
  async criarAgendamento(agendamento: Agendamento): Promise<void> {
    try {
      console.log('Criando agendamento:', agendamento);
      const isAvailable = await this.verificarDisponibilidade(
        new Date(agendamento.data),
        agendamento.hora
      );
      if (!isAvailable) {
        throw new Error('Horário já ocupado');
      }
      await addDoc(collection(firestore, 'appointments'), {
        ...agendamento,
        criadoEm: Timestamp.fromDate(new Date()),
        timestamp: Timestamp.fromDate(new Date(`${agendamento.data}T${agendamento.hora}:00-03:00`)),
        status: agendamento.status || 'pendente',
      });
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      throw new Error('Erro ao criar agendamento: ' + error.message);
    }
  },

  async obterAgendamentosUsuario(userId: string): Promise<Agendamento[]> {
    try {
      console.log('Buscando agendamentos para userId:', userId);
      // Query requires index on: proprietarioId (Ascending), status (Ascending), criadoEm (Descending)
      const q = query(
        collection(firestore, 'appointments'),
        where('proprietarioId', '==', userId),
        where('status', '==', 'pendente'),
        orderBy('criadoEm', 'desc')
      );
      const snapshot = await getDocs(q);
      const appointments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          criadoEm: data.criadoEm && typeof data.criadoEm.toDate === 'function'
            ? data.criadoEm.toDate()
            : new Date(),
          timestamp: data.timestamp && typeof data.timestamp.toDate === 'function'
            ? data.timestamp.toDate()
            : new Date(),
        } as Agendamento;
      });
      console.log('Agendamentos encontrados:', appointments.length);
      return appointments;
    } catch (error: any) {
      console.error('Erro ao buscar agendamentos:', error);
      if (error.message.includes('index')) {
        throw new Error(
          `Índice do banco de dados necessário. Crie o índice no Firebase Console: ${error.message}`
        );
      }
      throw new Error('Erro ao buscar agendamentos: ' + error.message);
    }
  },

  async obterTodosAgendamentos(): Promise<Agendamento[]> {
    try {
      console.log('Buscando todos os agendamentos');
      // Query requires index on: status (Ascending), criadoEm (Descending)
      const q = query(
        collection(firestore, 'appointments'),
        where('status', '==', 'pendente'),
        orderBy('criadoEm', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          criadoEm: data.criadoEm && typeof data.criadoEm.toDate === 'function'
            ? data.criadoEm.toDate()
            : new Date(),
          timestamp: data.timestamp && typeof data.timestamp.toDate === 'function'
            ? data.timestamp.toDate()
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
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento não encontrado: ${docRef.path}`);
      }
      const isAvailable = await this.verificarDisponibilidade(
        new Date(agendamento.data),
        agendamento.hora
      );
      if (!isAvailable && docSnap.data().timestamp.toDate().toISOString() !== new Date(`${agendamento.data}T${agendamento.hora}:00-03:00`).toISOString()) {
        throw new Error('Horário já ocupado');
      }
      await updateDoc(docRef, {
        ...agendamento,
        atualizadoEm: Timestamp.fromDate(new Date()),
        timestamp: Timestamp.fromDate(new Date(`${agendamento.data}T${agendamento.hora}:00-03:00`)),
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
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento não encontrado: ${docRef.path}`);
      }
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
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento não encontrado: ${docRef.path}`);
      }
      await updateDoc(docRef, { status: 'cancelado', atualizadoEm: Timestamp.fromDate(new Date()) });
    } catch (error: any) {
      console.error('Erro ao cancelar agendamento:', error);
      throw new Error('Erro ao cancelar agendamento: ' + error.message);
    }
  },

  async verificarDisponibilidade(data: Date, hora: string): Promise<boolean> {
    try {
      console.log('Verificando disponibilidade:', { data, hora });
      // Query requires index on: data (Ascending), hora (Ascending), status (Ascending)
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