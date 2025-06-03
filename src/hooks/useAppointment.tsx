'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { appointmentService } from '@/services/appointment-service';
import { Agendamento } from '@/types/tipos-auth';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface AppointmentContextType {
  appointments: Agendamento[];
  loading: boolean;
  error: string | null;
  fetchAppointments: () => Promise<void>;
  createAppointment: (appointment: Agendamento) => Promise<void>;
  updateAppointment: (appointment: Agendamento) => Promise<void>;
  cancelAppointment: (appointmentId: string) => Promise<void>;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const AppointmentProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    if (!user || !user.id) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      console.log('Buscando agendamentos para userId:', user.id);
      const data = await appointmentService.obterAgendamentosUsuario(user.id);
      setAppointments(data);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao buscar agendamentos:', err);
      setError(err.message || 'Erro ao carregar agendamentos');
      toast.error(err.message || 'Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (appointment: Agendamento) => {
    if (!user || !user.id) {
      throw new Error('Usuário não autenticado');
    }
    try {
      console.log('Criando agendamento:', appointment);
      await appointmentService.criarAgendamento({ ...appointment, proprietarioId: user.id });
      await fetchAppointments();
      toast.success('Agendamento criado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao criar agendamento:', err);
      toast.error(err.message || 'Erro ao criar agendamento');
      throw err;
    }
  };

  const updateAppointment = async (appointment: Agendamento) => {
    if (!user || !user.id) {
      throw new Error('Usuário não autenticado');
    }
    if (!appointment.id) {
      throw new Error('ID do agendamento é obrigatório');
    }
    try {
      console.log('Atualizando agendamento:', appointment);
      await appointmentService.atualizarAgendamento({ ...appointment, proprietarioId: user.id });
      await fetchAppointments();
      toast.success('Agendamento atualizado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar agendamento:', err);
      if (err.message.includes('Documento não encontrado')) {
        toast.error('Agendamento não encontrado. Pode ter sido excluído.');
      } else {
        toast.error(err.message || 'Erro ao atualizar agendamento');
      }
      throw err;
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    if (!user || !user.id) {
      throw new Error('Usuário não autenticado');
    }
    try {
      console.log('Excluindo agendamento:', appointmentId);
      await appointmentService.excluirAgendamento(appointmentId);
      await fetchAppointments();
      toast.success('Agendamento excluído com sucesso!');
    } catch (err: any) {
      console.error('Erro ao excluir agendamento:', err);
      if (err.message.includes('Documento não encontrado')) {
        toast.error('Agendamento não encontrado. Pode ter sido excluído.');
      } else {
        toast.error(err.message || 'Erro ao excluir agendamento');
      }
      throw err;
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        loading,
        error,
        fetchAppointments,
        createAppointment,
        updateAppointment,
        cancelAppointment,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
};

export const useAppointment = () => {
  const context = useContext(AppointmentContext);
  if (context === undefined) {
    throw new Error('useAppointment deve ser usado dentro de um AppointmentProvider');
  }
  return context;
};