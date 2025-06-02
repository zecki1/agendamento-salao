// components/TimeSelector.tsx
// Componente para seleção de horários disponíveis

import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { appointmentService } from "../services/appointment-service";
import { getAvailableHours } from "../utils";
import { Clock, Check } from "lucide-react";

interface TimeSelectorProps {
  selectedDate: Date | undefined;
  onSelectTime: (time: string | null) => void;
  selectedTime: string | null;
}

export function TimeSelector({ selectedDate, onSelectTime, selectedTime }: TimeSelectorProps) {
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedDate) {
        setAvailableHours([]);
        return;
      }

      setIsLoading(true);
      try {
        // Obter todos os horários possíveis (de 2 em 2 horas)
        const allHours = getAvailableHours();
        
        // Verificar disponibilidade para cada horário
        const availableTimeSlots = [];
        
        for (const time of allHours) {
          const isAvailable = await appointmentService.checkAvailability(selectedDate, time);
          if (isAvailable) {
            availableTimeSlots.push(time);
          }
        }
        
        setAvailableHours(availableTimeSlots);
      } catch (error) {
        console.error("Erro ao verificar disponibilidade:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAvailability();
  }, [selectedDate]);

  const handleTimeSelect = (time: string) => {
    onSelectTime(time === selectedTime ? null : time);
  };

  if (!selectedDate) {
    return null;
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Horário</label>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Verificando horários disponíveis...</p>
      ) : availableHours.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {availableHours.map((time) => (
            <Button
              key={time}
              type="button"
              variant={selectedTime === time ? "default" : "outline"}
              className="justify-start"
              onClick={() => handleTimeSelect(time)}
            >
              <Clock className="h-4 w-4 mr-2" />
              {time}
              {selectedTime === time && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Não há horários disponíveis para esta data.
        </p>
      )}
    </div>
  );
}
