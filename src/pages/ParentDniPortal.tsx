import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, GraduationCap, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import { toast } from 'sonner';

/** Portal público para padres — solo DNI del estudiante. */
export function ParentDniPortal() {
  const navigate = useNavigate();
  const [dni, setDni] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = dni.trim();
    if (!trimmed) {
      toast.error('Ingrese el DNI del estudiante');
      return;
    }
    navigate(`/llegada/dni/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col" lang="es">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col px-4 pt-8 pb-10">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Volver al login
        </Link>

        <header className="flex items-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">
              I.E. San Ramón
            </p>
            <p className="text-xs text-slate-400">Portal de padres y apoderados</p>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex-1">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 border border-primary/25">
              <Users className="w-5 h-5 text-primary" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-white">Consultar asistencia</h1>
              <p className="text-xs text-slate-400 mt-0.5">Ingresa el DNI de tu hijo/a</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parent-dni" className="text-sm text-slate-300">
                DNI del estudiante
              </Label>
              <Input
                id="parent-dni"
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                className="h-12 text-center text-lg font-bold tracking-widest bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                placeholder="Ej. 61814729"
                autoComplete="off"
                maxLength={12}
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={!dni.trim()}
              className="w-full h-12 text-base font-semibold"
            >
              <Search className="mr-2 h-4 w-4" aria-hidden />
              Ver asistencia
            </Button>
          </form>

          <p className="mt-6 text-center text-[11px] text-slate-500 leading-relaxed">
            El DNI es el mismo código que aparece en el carnet escolar del estudiante.
          </p>
        </div>

        <footer className="mt-8 text-center text-[11px] text-slate-500 leading-relaxed">
          <h2 className="sr-only">Acerca del portal familiar</h2>
          <p>
            Portal de padres y apoderados de la I.E. San Ramón. Consulte la asistencia y llegadas
            del día a través del Sistema de Incidencias Escolares (SIE Asiscole).
          </p>
        </footer>
      </div>
    </div>
  );
}
