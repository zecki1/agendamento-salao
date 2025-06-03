'use client';

import { useState, useEffect } from 'react';
import { appointmentService } from '@/services/appointment-service';
import { format, addMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TimeSelectorProps {
  selectedDate?: Date;
  selectedTime?: string;
  onSelectTime: (time: string | null) => void;
}

export const TimeSelector = ({ selectedDate, selectedTime, onSelectTime }: TimeSelectorProps) => {
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAvailableTimes = async () => {
      if (!selectedDate) {
        setAvailableTimes([]);
        return;
      }

      setLoading(true);
      try {
        console.log('Buscando horários disponíveis para:', selectedDate);
        const times: string[] = [];
        const startHour = 8;
        const endHour = 22;
        const interval = 30; // minutos

        for (let hour = startHour; hour < endHour; hour++) {
          for (let minute = 0; minute < 60; minute += interval) {
            const time = format(new Date().setHours(hour, minute, 0, 0), 'HH:mm', { locale: ptBR });
            const isAvailable = await appointmentService.verificarDisponibilidade(selectedDate, time);
            if (isAvailable) {
              times.push(time);
            }
          }
        }
        setAvailableTimes(times);
      } catch (error) {
        console.error('Erro ao buscar horários disponíveis:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableTimes();
  }, [selectedDate]);

  const handleTimeChange = (value: string) => {
    onSelectTime(value);
  };

  return (
    <Select value={selectedTime} onValueChange={handleTimeChange} disabled={loading || !selectedDate}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione um horário'} />
      </SelectTrigger>
      <SelectContent>
        {availableTimes.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};