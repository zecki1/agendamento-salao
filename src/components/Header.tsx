'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Moon, Sun, LogOut, LogIn } from 'lucide-react';

export default function Header() {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <header className="border-b">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold" data-aos="fade-in">Palpites do Arthurzinho</h1>
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