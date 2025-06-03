'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Moon, Sun, LogOut, LogIn, Menu } from 'lucide-react';
import { useState } from 'react';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';

export default function Header() {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

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
                    {/* Menu de Navegação para Telas Maiores */}
                    {user && (
                        <NavigationMenu className="hidden md:flex">
                            <NavigationMenuList>
                                <NavigationMenuItem>
                                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                                        <Link href="/calendar">Agenda</Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                                        <Link href="/services">Gerenciamento de Serviços</Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                                        <Link href="/custos">Relatórios e Custos</Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            </NavigationMenuList>
                        </NavigationMenu>
                    )}

                    {/* Nome do Usuário */}
                    {user && (
                        <div className="text-sm font-semibold">
                            {user.displayName || user.email || 'zecki1@hotmail.com'}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Botão de Tema */}
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

                    {/* Botão de Login/Logout */}
                    {user ? (
                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            data-aos="fade-in"
                            data-aos-delay="200"
                        >
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

                    {/* Menu Hamburguer para Telas Menores */}
                    {user && (
                        <Sheet open={isOpen} onOpenChange={setIsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="md:hidden">
                                    <Menu className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right">
                                <nav className="flex flex-col gap-12 mt-24 ml-10">
                                    <Link href="/calendar" onClick={() => setIsOpen(false)}>
                                        Agenda
                                    </Link>
                                    <Link href="/services" onClick={() => setIsOpen(false)}>
                                        Gerenciamento de Serviços
                                    </Link>
                                    <Link href="/custos" onClick={() => setIsOpen(false)}>
                                        Relatórios e Custos
                                    </Link>
                                </nav>
                            </SheetContent>
                        </Sheet>
                    )}
                </div>
            </div>
        </header>
    );
}