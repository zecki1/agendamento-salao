'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Moon, Sun, LogOut, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
    date: string;
    cost: number;
    clientId: string;
    ownerId: string;
}

export default function Header() {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const router = useRouter();
    const [dailyRevenue, setDailyRevenue] = useState(0);
    const [monthlyRevenue, setMonthlyRevenue] = useState(0);
    const [dailyClients, setDailyClients] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) {
            setIsLoading(false);
            return;
        }

        const fetchFinancials = async () => {
            try {
                setIsLoading(true);
                const appointmentsQuery = query(
                    collection(firestore, 'appointments'),
                    where('ownerId', '==', user.uid)
                );
                const appointmentsSnapshot = await getDocs(appointmentsQuery);
                const appointments = appointmentsSnapshot.docs.map((doc) => ({
                    date: doc.data().date,
                    cost: doc.data().cost || 0,
                    clientId: doc.data().clientId,
                    ownerId: doc.data().ownerId,
                })) as Appointment[];

                const today = new Date();
                const dailyAppointments = appointments.filter((appt) =>
                    isSameDay(new Date(appt.date), today)
                );
                const monthlyAppointments = appointments.filter((appt) =>
                    isSameMonth(new Date(appt.date), today)
                );

                setDailyRevenue(dailyAppointments.reduce((sum, appt) => sum + appt.cost, 0));
                setMonthlyRevenue(monthlyAppointments.reduce((sum, appt) => sum + appt.cost, 0));
                setDailyClients([...new Set(dailyAppointments.map((appt) => appt.clientId))].length);
            } catch (error) {
                console.error('Erro ao buscar finanças:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFinancials();
    }, [user]);

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    return (
        <header className="border-b bg-background">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">

                    {user && !isLoading && (
                        <div className="text-sm">
                            <span className="font-semibold">{user.displayName || user.email}</span>
                            <div>Hoje: R${dailyRevenue.toFixed(2)} | {dailyClients} cliente(s)</div>
                            <div>Mês: R${monthlyRevenue.toFixed(2)}</div>
                        </div>
                    )}
                    {isLoading && user && <div className="text-sm">Carregando finanças...</div>}
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleTheme}
                        title="Alternar tema"
                        data-aos="fade-in"
                        data-aos-delay="100"
                    >
                        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    </Button>
                    {user ? (
                        <Button variant="outline" onClick={handleLogout} data-aos="fade-in" data-aos-delay="200">
                            <LogOut className="h-4 w-4 mr-2" />
                            Sair
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => router.push('/login')}
                            data-aos="fade-in"
                            data-aos-delay="200"
                        >
                            <LogIn className="h-4 w-4 mr-2" />
                            Entrar
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}