// utils.ts
// Funções utilitárias para o sistema de agendamento

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function getAvailableHours(): string[] {
  // Horários disponíveis de 2 em 2 horas (8h às 18h)
  return ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
}
