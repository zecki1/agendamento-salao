'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppointment } from '@/hooks/useAppointment';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { format, parse, differenceInHours, differenceInDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function CalendarPage() {
  const { user } = useAuth();
  const { appointments, allAppointments, createAppointment, isLoading, error } = useAppointment();
  const router = useRouter();
  const [isGuessDialogOpen, setIsGuessDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isGuessDetailDialogOpen, setIsGuessDetailDialogOpen] = useState(false);
  const [hasAppointment, setHasAppointment] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [time, setTime] = useState('');
  const [selectedEventDate, setSelectedEventDate] = useState<Date | null>(null);
  const [eventDetails, setEventDetails] = useState<{ userName: string; time: string }[]>([]);
  const [selectedGuess, setSelectedGuess] = useState<{ userName: string; date: Date; time: string } | null>(null);
  const [gestationalAge, setGestationalAge] = useState<{ weeks: number; days: number }>({ weeks: 37, days: 1 });

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else if (appointments.length > 0) {
      setHasAppointment(true);
    }
  }, [user, appointments, router]);

  useEffect(() => {
    // Calculate gestational age: 37 weeks and 1 day (260 days) on May 31, 2025
    const startDate = new Date('2024-09-14'); // May 31, 2025 - 260 days
    const today = startOfDay(new Date());
    const daysSinceStart = differenceInDays(today, startDate);
    const weeks = Math.floor(daysSinceStart / 7);
    const days = daysSinceStart % 7;
    setGestationalAge({ weeks, days });
  }, []);

  const formatName = (name: string) => {
    if (!name) return 'Anônimo';
    const trimmedName = name.trim().slice(0, 20);
    return trimmedName
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const isTimeRestricted = (selectedDate: Date, time: string, existingTimes: string[]): boolean => {
    const selectedDateTime = parse(time, 'HH:mm', selectedDate);
    for (const existingTime of existingTimes) {
      const existingDateTime = parse(existingTime, 'HH:mm', selectedDate);
      const hoursDiff = Math.abs(differenceInHours(selectedDateTime, existingDateTime));
      if (hoursDiff < 2) {
        return true; // Within 2-hour restriction
      }
    }
    return false;
  };

  const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

  const handleDateClick = (info: { date: Date }) => {
    const clickedDate = info.date;
    const eventsOnDate = allAppointments.filter(
      (appt) => appt.date.getTime() === clickedDate.getTime()
    );

    setSelectedEventDate(clickedDate);
    setEventDetails(
      eventsOnDate.map((appt) => ({
        userName: formatName(appt.userName),
        time: appt.time,
      }))
    );
    setIsEventDialogOpen(true);
  };

  const handleEventClick = (info: { event: { id: string; title: string; start: Date } }) => {
    const event = allAppointments.find((appt) => appt.id === info.event.id);
    if (event && info.event.start) {
      setSelectedGuess({
        userName: formatName(event.userName),
        date: info.event.start,
        time: event.time,
      });
      setSelectedEventDate(info.event.start);
      setIsGuessDetailDialogOpen(true);
    }
  };

  const handleAddGuess = () => {
    if (!hasAppointment && selectedEventDate) {
      setSelectedDate(selectedEventDate);
      setTime('');
      setIsEventDialogOpen(false);
      setIsGuessDetailDialogOpen(false);
      setIsGuessDialogOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !time) return;

    const eventsOnDate = allAppointments.filter(
      (appt) => appt.date.getTime() === selectedDate.getTime()
    );
    const existingTimes = eventsOnDate.map((appt) => appt.time);

    if (existingTimes.includes(time)) {
      toast.error('Este horário já está reservado. Escolha outro!');
      return;
    }

    if (isTimeRestricted(selectedDate, time, existingTimes)) {
      toast.error('Os palpites devem ter pelo menos 2 horas de diferença. Escolha outro horário!');
      return;
    }

    try {
      await createAppointment(selectedDate, time, user?.name || 'Anônimo');
      setIsGuessDialogOpen(false);
      setSelectedDate(null);
      setTime('');
      toast.success('Palpite registrado com sucesso!');
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
      toast.error('Erro ao registrar palpite. Tente novamente.');
    }
  };

  const validateTime = (value: string) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(value);
  };

  const events = allAppointments.map((appt) => ({
    id: appt.id,
    title: isMobile() ? '' : `${formatName(appt.userName)} - ${appt.time}`,
    start: new Date(
      appt.date.getFullYear(),
      appt.date.getMonth(),
      appt.date.getDate(),
      parseInt(appt.time.split(':')[0]),
      parseInt(appt.time.split(':')[1])
    ),
    allDay: false,
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    textColor: '#ffffff',
  }));

  const isDateInValidRange = (date: Date) => {
    const start = new Date('2025-06-01');
    const end = new Date('2025-07-01');
    return date >= start && date < end;
  };

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen p-2 sm:p-4 ">
      <div className="container mx-auto w-full max-w-6xl flex flex-col gap-4">
        {/* Bem-vindo ao Jogo do Arthurzinho! */}
        <Card className="w-full shadow-xl" data-aos="fade-up" data-aos-delay="100">
          <CardContent className="pt-4 sm:pt-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Bem-vindo ao palpite do Arthurzinho!</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              Olá, tudo incrível por aí? 😊 <br />
              Estou super animado porque logo serei papai! 🎉 O Arthurzinho está a caminho, e quero compartilhar essa alegria com você. Participe da brincadeira: <strong>adivinhe o dia e horário do nascimento!</strong> <br /><br />
              A previsão é até <strong>30 de junho</strong>. Cada pessoa tem <strong>uma chance</strong> de palpitar. O mais próximo ganha um <strong>brinde especial</strong>! 💝 <br /><br />
              Vamos celebrar juntos? Faça seu palpite!
            </p>
            <p className="text-xs sm:text-sm mt-4" data-aos="fade-up" data-aos-delay="200">
              Gestação: {gestationalAge.weeks} semanas e {gestationalAge.days} dia{gestationalAge.days !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
       
        {/* Conteúdo Principal */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Calendário */}
          <Card className="w-full shadow-xl" data-aos="fade-right" data-aos-delay="400">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-semibold">Escolha sua data</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 ">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate="2025-06-01"
                locale="pt-br"
                events={events}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: '',
                }}
                height="auto"
                eventContent={(eventInfo) => (
                  <div className="flex items-center text-xs overflow-hidden ">
                    {isMobile() ? (
                      <Clock className="h-3 w-3" />
                    ) : (
                      <>
                        <Clock className="mr-1 h-3 w-3" />
                        <span className="truncate">{eventInfo.event.title}</span>
                      </>
                    )}
                  </div>
                )}
                dayMaxEvents={3}
                moreLinkContent="Mais..."
                moreLinkClick="popover"
                dayCellClassNames={(arg) =>
                  isDateInValidRange(arg.date) ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }
                eventClassNames="rounded-md p-1 m-0.5"
                className=" rounded-lg text-xs border"
              />
              {hasAppointment ? (
                <p className="text-xs sm:text-sm mt-4 text-center" data-aos="fade-up" data-aos-delay="500">
                  Você já fez seu palpite! Veja os palpites de todos acima.
                </p>
              ) : (
                <p className="text-xs sm:text-sm mt-4 text-center" data-aos="fade-up" data-aos-delay="500">
                  Clique em uma data para fazer seu palpite!
                </p>
              )}
              {error && (
                <p className="text-red-500 text-xs mt-4 text-center" data-aos="fade-in" data-aos-delay="600">
                  {error}
                </p>
              )}
            </CardContent>
          </Card>
          {/* Texto */}
          {/* Regras do Jogo */}
          <Card className="w-full shadow-xl  lg:w-2/3" data-aos="fade-up" data-aos-delay="300">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-semibold">Regras do palpite</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <li><strong>Um palpite por usuário</strong>: Cada participante pode registrar apenas um palpite para o dia e horário do nascimento do Arthurzinho.</li>
                <li><strong>Registro do palpite</strong>: Todos os palpites são salvos e podem ser acompanhados ao fazer login na plataforma.</li>
                <li><strong>Formato do palpite</strong>: Escolha uma data (entre 1º e 30 de junho de 2025) e um horário (HH:mm, com intervalos de 2 horas).</li>
                <li><strong>Prêmio</strong>: O participante que acertar ou chegar mais próximo ganhará um brinde especial!</li>
                <li><strong>Visibilidade dos palpites</strong>: Veja os palpites de outros, identificados pelo nome ou apelido.</li>
                <li><strong>Prazo</strong>: Palpites até 05 de junho de 2025.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para Novo Palpite */}
      <Dialog open={isGuessDialogOpen} onOpenChange={setIsGuessDialogOpen} data-aos="zoom-in" data-aos-delay="100">
        <DialogContent className="shadow-xl max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Escolha Seu Palpite</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" data-aos="fade-up" data-aos-delay="200">
            <div>
              <Label className="text-xs">Data Selecionada</Label>
              <Input
                value={selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : ''}
                readOnly
                className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="time" className="text-xs">Horário (HH:mm)</Label>
              <Input
                id="time"
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="Ex.: 14:30"
                required
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                title="Formato: HH:mm (ex.: 14:30)"
                className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={isLoading || !selectedDate || !validateTime(time)}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-xs sm:text-sm"
                data-aos="fade-up"
                data-aos-delay="300"
              >
                {isLoading ? 'Carregando...' : 'Enviar Palpite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Detalhes de Eventos */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen} data-aos="zoom-in" data-aos-delay="100">
        <DialogContent className="shadow-xl max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Palpites para {selectedEventDate ? format(selectedEventDate, 'PPP', { locale: ptBR }) : ''}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lista de participantes que palpitaram nesta data.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto py-2">
            {eventDetails.length > 0 ? (
              <ul className="space-y-1 text-xs sm:text-sm">
                {eventDetails.map((detail, index) => (
                  <li key={index}>
                    <span className={isMobile() ? 'text-green-600' : ''}>
                      {detail.userName}
                    </span>
                    {' - '}
                    {detail.time}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">Nenhum palpite para esta data.</p>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2">
            {!hasAppointment && (
              <Button
                onClick={handleAddGuess}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-xs sm:text-sm"
                data-aos="fade-up"
                data-aos-delay="400"
              >
                Adicionar Palpite
              </Button>
            )}
            <Button
              onClick={() => setIsEventDialogOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-xs sm:text-sm"
              data-aos="fade-up"
              data-aos-delay="400"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Detalhes do Palpite */}
      <Dialog open={isGuessDetailDialogOpen} onOpenChange={setIsGuessDetailDialogOpen} data-aos="zoom-in" data-aos-delay="100">
        <DialogContent className="shadow-xl max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Detalhes do Palpite</DialogTitle>
          </DialogHeader>
          {selectedGuess && (
            <div className="py-2 text-xs sm:text-sm">
              <p><strong>Nome:</strong> {selectedGuess.userName}</p>
              <p><strong>Data:</strong> {format(selectedGuess.date, 'PPP', { locale: ptBR })}</p>
              <p><strong>Horário:</strong> {selectedGuess.time}</p>
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2">
            {!hasAppointment && (
              <Button
                onClick={handleAddGuess}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-xs sm:text-sm"
                data-aos="fade-up"
                data-aos-delay="400"
              >
                Adicionar Palpite
              </Button>
            )}
            <Button
              onClick={() => setIsGuessDetailDialogOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-xs sm:text-sm"
              data-aos="fade-up"
              data-aos-delay="400"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}