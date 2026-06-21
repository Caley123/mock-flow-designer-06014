import React, { useEffect, useRef } from 'react';
import { useSprings, animated, to as interpolate } from '@react-spring/web';
import {
  BookOpen,
  Calculator,
  Lightbulb,
  Globe,
  GraduationCap,
  School,
  Award,
  Target,
  type LucideIcon,
} from 'lucide-react';

interface CardData {
  icon: LucideIcon;
  title: string;
  gradient: string;
}

const CARDS: CardData[] = [
  { icon: BookOpen,       title: 'Aprendizaje', gradient: 'from-blue-500 to-blue-700' },
  { icon: Calculator,    title: 'Matemáticas',  gradient: 'from-green-500 to-green-700' },
  { icon: Lightbulb,     title: 'Innovación',   gradient: 'from-yellow-500 to-yellow-600' },
  { icon: Globe,         title: 'Conocimiento', gradient: 'from-purple-500 to-purple-700' },
  { icon: GraduationCap, title: 'Educación',    gradient: 'from-indigo-500 to-indigo-700' },
  { icon: School,        title: 'Escuela',      gradient: 'from-red-500 to-red-700' },
  { icon: Award,         title: 'Excelencia',   gradient: 'from-amber-500 to-amber-600' },
  { icon: Target,        title: 'Objetivos',    gradient: 'from-teal-500 to-teal-700' },
];

const toSpring = (i: number) => ({
  x: 0,
  y: i * -4,
  scale: 1,
  rot: -10 + Math.random() * 20,
  delay: i * 80,
});
const fromSpring = () => ({ x: 0, rot: 0, scale: 1.5, y: -1000 });
const cardTransform = (r: number, s: number) =>
  `perspective(1500px) rotateX(30deg) rotateY(${r / 10}deg) rotateZ(${r}deg) scale(${s})`;

interface LoadingScreenProps {
  message?: string;
  /** true → cubre toda la pantalla (solo para rutas sin Layout).
   *  false → se muestra dentro del área de contenido. */
  fullScreen?: boolean;
}

/** Contenido de la animación: mazo de cartas + puntos de carga. */
const CardDeck: React.FC<{ message: string }> = ({ message }) => {
  const [springs, api] = useSprings(CARDS.length, (i) => ({
    ...toSpring(i),
    from: fromSpring(),
  }));

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.start((i) => ({
      ...toSpring(i),
      from: fromSpring(),
      config: { tension: 280, friction: 48 },
    }));

    intervalRef.current = setInterval(() => {
      api.start((i) => ({
        ...toSpring(i),
        from: fromSpring(),
        config: { tension: 280, friction: 48 },
      }));
    }, 3800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      api.stop();
    };
  }, [api]);

  return (
    <>
      {/* Orbs de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
      </div>

      {/* Mazo de tarjetas */}
      <div className="relative z-10 mb-8" style={{ width: 300, height: 400 }}>
        {springs.map(({ x, y, rot, scale }, i) => {
          const CardIcon = CARDS[i].icon;
          return (
            <animated.div
              key={i}
              className="absolute inset-0 flex items-center justify-center will-change-transform"
              style={{ x, y, transform: interpolate([rot, scale], cardTransform) }}
            >
              <div
                className={`w-64 h-80 rounded-2xl bg-gradient-to-br ${CARDS[i].gradient} shadow-2xl border-4 border-white/20 flex flex-col items-center justify-center p-6`}
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3),inset 0 0 0 1px rgba(255,255,255,0.1)' }}
              >
                <div className="bg-white/20 rounded-full p-6 mb-4">
                  <CardIcon className="w-16 h-16 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-white font-bold text-xl text-center drop-shadow-lg">
                  {CARDS[i].title}
                </h3>
                <span className="absolute top-4 left-4 text-white/30 font-bold text-2xl select-none">
                  {i + 1}
                </span>
              </div>
            </animated.div>
          );
        })}
      </div>

      {/* Puntos de carga + mensaje */}
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                animationDelay: `${delay}ms`,
                background: delay === 150 ? '#a78bfa' : '#60a5fa',
              }}
            />
          ))}
        </div>
        <p className="text-white/90 text-lg font-medium">{message}</p>
      </div>
    </>
  );
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Cargando…',
  fullScreen = true,
}) => {
  if (fullScreen) {
    /* Cubre toda la pantalla — solo para rutas sin Layout (Login, etc.).
       Aparece con 300 ms de fade-in para no parpadear en cargas rápidas. */
    return (
      <div
        className="fixed inset-0 z-[9999] animate-in fade-in duration-300"
        style={{ animationDelay: '300ms', animationFillMode: 'both' }}
      >
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
          <CardDeck message={message} />
        </div>
      </div>
    );
  }

  /* Modo inline — dentro del área de contenido (Layout).
     La sidebar queda fuera y sigue visible. */
  return (
    <div
      className="w-full animate-in fade-in duration-300"
      style={{ animationDelay: '300ms', animationFillMode: 'both' }}
    >
      <div className="flex flex-col items-center justify-center min-h-[65vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden rounded-xl mx-4 my-4">
        <CardDeck message={message} />
      </div>
    </div>
  );
};
