import AOS from 'aos';
import 'aos/dist/aos.css';

export function initAOS() {
    AOS.init({
        duration: 800, // Duração das animações em milissegundos
        once: true, // Anima apenas uma vez ao rolar
        mirror: false, // Não anima novamente ao rolar para cima
    });
}