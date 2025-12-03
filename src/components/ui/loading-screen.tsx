import React, { useEffect } from 'react';
import { useSprings, animated, to as interpolate } from '@react-spring/web';
import { BookOpen, Calculator, Lightbulb, Globe, GraduationCap, School, Award, Target } from 'lucide-react';

interface CardData {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: string;
  gradient: string;
}

const cards: CardData[] = [
  { icon: BookOpen, title: 'Aprendizaje', color: 'from-blue-500 to-blue-700', gradient: 'bg-gradient-to-br from-blue-500 to-blue-700' },
  { icon: Calculator, title: 'Matemáticas', color: 'from-green-500 to-green-700', gradient: 'bg-gradient-to-br from-green-500 to-green-700' },
  { icon: Lightbulb, title: 'Innovación', color: 'from-yellow-500 to-yellow-700', gradient: 'bg-gradient-to-br from-yellow-500 to-yellow-700' },
  { icon: Globe, title: 'Conocimiento', color: 'from-purple-500 to-purple-700', gradient: 'bg-gradient-to-br from-purple-500 to-purple-700' },
  { icon: GraduationCap, title: 'Educación', color: 'from-indigo-500 to-indigo-700', gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-700' },
  { icon: School, title: 'Escuela', color: 'from-red-500 to-red-700', gradient: 'bg-gradient-to-br from-red-500 to-red-700' },
  { icon: Award, title: 'Excelencia', color: 'from-amber-500 to-amber-700', gradient: 'bg-gradient-to-br from-amber-500 to-amber-700' },
  { icon: Target, title: 'Objetivos', color: 'from-teal-500 to-teal-700', gradient: 'bg-gradient-to-br from-teal-500 to-teal-700' },
];

// Helper functions for spring animations
const to = (i: number) => ({
  x: 0,
  y: i * -4,
  scale: 1,
  rot: -10 + Math.random() * 20,
  delay: i * 100,
});

const from = (_i: number) => ({ 
  x: 0, 
  rot: 0, 
  scale: 1.5, 
  y: -1000 
});

// Transform function for 3D rotation
const trans = (r: number, s: number) =>
  `perspective(1500px) rotateX(30deg) rotateY(${r / 10}deg) rotateZ(${r}deg) scale(${s})`;

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Cargando...', 
  fullScreen = true 
}) => {
  const [props, api] = useSprings(cards.length, i => ({
    ...to(i),
    from: from(i),
  }));

  // Auto-animate cards in a loop
  useEffect(() => {
    // Initial animation
    api.start(i => ({
      ...to(i),
      from: from(i),
      config: { tension: 300, friction: 50 },
    }));

    const interval = setInterval(() => {
      api.start(i => ({
        ...to(i),
        from: from(i),
        config: { tension: 300, friction: 50 },
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, [api]);

  const content = (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Cards deck */}
      <div className="relative z-10 mb-8" style={{ width: '300px', height: '400px' }}>
        {props.map(({ x, y, rot, scale }, i) => {
          const CardIcon = cards[i].icon;
          return (
            <animated.div
              key={i}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                x,
                y,
                transform: interpolate([rot, scale], trans),
              }}
            >
              <div
                className={`w-64 h-80 rounded-2xl ${cards[i].gradient} shadow-2xl border-4 border-white/20 flex flex-col items-center justify-center p-6 backdrop-blur-sm`}
                style={{
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.1)',
                }}
              >
                <div className="bg-white/20 rounded-full p-6 mb-4 backdrop-blur-sm">
                  <CardIcon className="w-16 h-16 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-white font-bold text-xl text-center drop-shadow-lg">
                  {cards[i].title}
                </h3>
                <div className="absolute top-4 left-4 text-white/30 font-bold text-2xl">
                  {i + 1}
                </div>
              </div>
            </animated.div>
          );
        })}
      </div>

      {/* Loading message */}
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-white/90 text-lg font-medium">{message}</p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999]">
        {content}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {content}
    </div>
  );
};

