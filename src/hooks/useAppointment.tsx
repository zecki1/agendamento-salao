'use client';

import { useState, useEffect } from 'react';
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
  cancelAppointment: (appointmentId: string) => Promise<void>;
}

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
      toast.error('Erro ao carregar agendamentos');
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

  const cancelAppointment = async (appointmentId: string) => {
    try {
      console.log('Cancelando agendamento:', appointmentId);
      await appointmentService.cancelarAgendamento(appointmentId);
      await fetchAppointments();
      toast.success('Agendamento cancelado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao cancelar agendamento:', err);
      toast.error(err.message || 'Erro ao cancelar agendamento');
      throw err;
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  return (
    <AppointmentContext.Provider
      value={{ appointments, loading, error, fetchAppointments, createAppointment, cancelAppointment }}
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

import { createContext, useContext } from 'react';

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);