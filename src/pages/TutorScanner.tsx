import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Barcode,
  Clock,
  AlertCircle,
  LogOut,
  X,
  ScanLine,
} from 'lucide-react';
import { StudentPhoto } from '@/components/shared/StudentPhoto';
import { GuardyMark } from '@/components/brand/GuardyMark';
import { toast } from 'sonner';
import {
  studentsService,
  faultsService,
  incidentsService,
  authService,
  arrivalService,
  whatsappService,
} from '@/lib/services';
import { Student, FaultType, ArrivalRecord } from '@/types';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { configService } from '@/lib/services';

export const TutorScanner = () => {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [faults, setFaults] = useState<FaultType[]>([]);
  const [selectedFault, setSelectedFault] = useState('');
  const [observations, setObservations] = useState('');
  const [registering, setRegistering] = useState(false);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [arrivalRecord, setArrivalRecord] = useState<ArrivalRecord | null>(null);
  const [arrivalLimit, setArrivalLimit] = useState<string>('08:00');
  const [nowHHMM, setNowHHMM] = useState<string>('');
  const [sessionCount, setSessionCount] = useState<{ total: number; onTime: number; late: number }>({
    total: 0,
    onTime: 0,
    late: 0,
  });
  const [recentScans, setRecentScans] = useState<
    Array<{ id: string; name: string; time: string; status: 'A tiempo' | 'Tarde' | string }>
  >([]);
  const isMountedRef = useRef(true);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const user = authService.getCurrentUser();

  const focusBarcodeInput = useCallback(() => {
    requestAnimationFrame(() => {
      const input = barcodeInputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      input.select();
    });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadFaults();
    arrivalService.prefetchArrivalConfig();
    loadArrivalLimit();
    const stopClock = startClock();
    focusBarcodeInput();

    return () => {
      isMountedRef.current = false;
      stopClock?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showIncidentDialog) {
      focusBarcodeInput();
    }
  }, [showIncidentDialog, focusBarcodeInput]);

  const loadFaults = async () => {
    if (!isMountedRef.current) return;

    try {
      const { faults: faultsList } = await faultsService.getAll(true);
      if (!isMountedRef.current) return;
      setFaults(faultsList);
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error loading faults:', error);
    }
  };

  const loadArrivalLimit = async () => {
    try {
      const { config } = await configService.getByKey('hora_limite_llegada');
      const raw = config?.value?.trim() || '08:00';
      const match = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return;
      const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
      const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
      setArrivalLimit(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    } catch {
      // Silencioso: mostramos valor por defecto
    }
  };

  const startClock = () => {
    const tick = () => {
      const now = new Date().toLocaleTimeString('es-PE', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setNowHHMM(now);
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  };

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    try {
      await authService.logout();
      toast.success('Sesión cerrada');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      navigate('/login', { replace: true });
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcode.trim() || !isMountedRef.current) {
      if (!isMountedRef.current) return;
      toast.error('Ingrese un código de barras');
      return;
    }

    const code = barcode.trim();
    setScanning(true);

    try {
      const { student: foundStudent, error } = await studentsService.getByBarcode(code, {
        skipReincidence: true,
      });

      if (!isMountedRef.current) return;

      if (error || !foundStudent) {
        toast.error('Estudiante no encontrado');
        setBarcode('');
        setScanning(false);
        focusBarcodeInput();
        return;
      }

      const currentUser = authService.getCurrentUser();
      const { record, error: arrivalError } = await arrivalService.createArrivalRecord(
        foundStudent.id,
        currentUser?.id
      );

      if (!isMountedRef.current) return;

      if (arrivalError) {
        console.error('Error al registrar llegada:', arrivalError);
        toast.error('Error al registrar la llegada');
        setBarcode('');
        setScanning(false);
        focusBarcodeInput();
        return;
      }

      const { student: fullStudent } = await studentsService.getById(foundStudent.id);
      const studentToShow = fullStudent ?? foundStudent;

      setStudent(studentToShow);
      setArrivalRecord(record);
      setShowStudentProfile(true);
      setBarcode('');

      const status = record?.status || 'Registrado';
      setSessionCount((prev) => ({
        total: prev.total + 1,
        onTime: prev.onTime + (status === 'A tiempo' ? 1 : 0),
        late: prev.late + (status === 'Tarde' ? 1 : 0),
      }));
      setRecentScans((prev) => {
        const next = [
          {
            id: `${Date.now()}-${studentToShow.id}`,
            name: studentToShow.fullName,
            time: record?.arrivalTime ?? nowHHMM,
            status,
          },
          ...prev,
        ];
        return next.slice(0, 6);
      });

      /* Sin animación ni toast en escaneo: la tarjeta y el feed lateral ya confirman la llegada */

      if (record && whatsappService.isEnabled()) {
        void whatsappService.notifyParentArrival(studentToShow, record).then((wa) => {
          if (!isMountedRef.current) return;
          if (!wa.ok && wa.error) {
            toast.warning(`WhatsApp: ${wa.error}`, { duration: 2800 });
          }
        });
      }
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      console.error('Error al escanear:', error);
      toast.error('Error al procesar el escaneo');
      setBarcode('');
    } finally {
      if (isMountedRef.current) {
        setScanning(false);
        focusBarcodeInput();
      }
    }
  };

  const handleRegisterFault = () => {
    if (!student) {
      toast.error('Debe escanear un estudiante primero');
      return;
    }
    setShowIncidentDialog(true);
  };

  const handleSubmitIncident = async () => {
    if (!student || !selectedFault || !isMountedRef.current) {
      if (!isMountedRef.current) return;
      toast.error('Debe seleccionar una falta');
      return;
    }

    setRegistering(true);

    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        toast.error('Usuario no autenticado');
        setRegistering(false);
        return;
      }

      const { error } = await incidentsService.create({
        studentId: student.id,
        faultTypeId: parseInt(selectedFault, 10),
        registeredBy: currentUser.id,
        observations: observations.trim() || undefined,
      });

      if (!isMountedRef.current) return;

      if (error) {
        toast.error(error, { duration: 3200 });
      } else {
        setShowIncidentDialog(false);
        setSelectedFault('');
        setObservations('');
        setStudent(null);
        setShowStudentProfile(false);
        setArrivalRecord(null);
        setBarcode('');
        focusBarcodeInput();
      }
    } catch {
      if (!isMountedRef.current) return;
      toast.error('Error al registrar incidencia');
    } finally {
      if (isMountedRef.current) {
        setRegistering(false);
      }
    }
  };

  const clearScan = () => {
    setBarcode('');
    setStudent(null);
    setShowStudentProfile(false);
    setArrivalRecord(null);
    focusBarcodeInput();
  };

  const closeStudentProfile = () => {
    setShowStudentProfile(false);
    setStudent(null);
    setArrivalRecord(null);
    setBarcode('');
    focusBarcodeInput();
  };

  const arrivalOnTime = arrivalRecord?.status === 'A tiempo';
  const displayArrivalTime =
    arrivalRecord?.arrivalTime?.length && arrivalRecord.arrivalTime.length >= 5
      ? arrivalRecord.arrivalTime.slice(0, 5)
      : arrivalRecord?.arrivalTime ?? '—:—';
  const limitTone = useMemo(() => {
    if (!nowHHMM) return 'secondary' as const;
    return nowHHMM <= arrivalLimit ? ('success' as const) : ('warning' as const);
  }, [nowHHMM, arrivalLimit]);

  return (
    <div className="tutor-page">
      <header className="tutor-header">
        <div className="tutor-header__inner">
          <div className="tutor-header__brand">
            <div className="tutor-header__shield p-1" aria-hidden>
              <GuardyMark size="sm" />
            </div>
            <div className="min-w-0">
              <p className="tutor-header__title">Control de asistencia</p>
              <p className="tutor-header__subtitle">SIE — Sistema de Incidencias Escolares</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="tutor-header__user">{user?.fullName}</span>
            <Badge
              variant="outline"
              className="sm:hidden border-[var(--tutor-lead)] bg-[var(--tutor-graphite)] text-[var(--tutor-starlight)] text-xs max-w-[100px] truncate"
            >
              {user?.fullName?.split(' ')[0]}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleLogout}
              className="border-[var(--tutor-lead)] bg-transparent text-[var(--tutor-starlight)] hover:bg-[var(--tutor-graphite)] hover:text-[var(--tutor-starlight)]"
            >
              <LogOut className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="tutor-main">
        <div className="tutor-grid">
          <section className="tutor-left">
            <div className="tutor-scan-card">
              <div className="tutor-scan-card__head">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <ScanLine className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-primary">
                        Registro de llegada
                      </p>
                      <Badge variant={limitTone} className="text-[10px]">
                        Límite {arrivalLimit}
                      </Badge>
                    </div>
                    <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
                      Escanear código de barras
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Enfoque automático, registro continuo y acceso rápido a incidencias.
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-5 sm:p-7 pt-5 sm:pt-6">
                <form onSubmit={handleScan} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="barcode-input" className="text-sm font-medium text-foreground">
                      Código de barras
                    </Label>
                    <Input
                      ref={barcodeInputRef}
                      id="barcode-input"
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      autoComplete="off"
                      autoFocus
                      className="tutor-scan-input"
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border bg-muted/20 px-2 py-1 font-mono">
                        Enter
                      </span>
                      <span>Registrar</span>
                      <span className="mx-1">·</span>
                      <span className="rounded-full border border-border bg-muted/20 px-2 py-1 font-mono">
                        Esc
                      </span>
                      <span>Limpiar</span>
                    </div>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearScan}
                      disabled={scanning}
                      className="sm:min-w-[120px]"
                    >
                      Limpiar
                    </Button>
                    <Button
                      type="submit"
                      disabled={scanning || !barcode.trim()}
                      className="sm:min-w-[180px]"
                    >
                      {scanning ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          Procesando…
                        </>
                      ) : (
                        <>
                          <Barcode className="h-4 w-4" />
                          Registrar llegada
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </div>

            {showStudentProfile && student && (
              <div
                className={`tutor-student-card ${arrivalOnTime ? 'tutor-student-card--ontime' : 'tutor-student-card--late'}`}
              >
                <div className="tutor-student-card__banner" aria-hidden />
                <div className="tutor-student-card__body">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="tutor-student-card__close"
                    onClick={closeStudentProfile}
                  >
                    <X className="h-5 w-5" />
                    <span className="sr-only">Cerrar</span>
                  </Button>

                  <div className="tutor-student-card__hero">
                    <StudentPhoto
                      src={student.profilePhoto}
                      name={student.fullName}
                      className="tutor-student-card__photo"
                    />
                    <div className="tutor-student-card__identity">
                      <Badge
                        variant={arrivalOnTime ? 'success' : 'warning'}
                        className="tutor-student-card__status mb-2"
                      >
                        {arrivalRecord?.status ?? 'Registrado'}
                      </Badge>
                      <h3 className="tutor-student-card__name">{student.fullName}</h3>
                      <p className="tutor-student-card__grade">
                        {student.level} · {student.grade} {student.section}
                      </p>
                    </div>
                  </div>

                  <div className="tutor-student-card__stats">
                    <div className="tutor-student-card__stat tutor-student-card__stat--time">
                      <p className="tutor-student-card__stat-label">Hora de llegada</p>
                      <p className="tutor-student-card__stat-value tutor-student-card__stat-value--clock">
                        {displayArrivalTime}
                      </p>
                    </div>
                    <div className="tutor-student-card__stat">
                      <p className="tutor-student-card__stat-label">Código de barras</p>
                      <p className="tutor-student-card__stat-value tutor-student-card__stat-value--code">
                        {student.barcode || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="tutor-student-card__actions">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={closeStudentProfile}
                      className="tutor-student-card__btn-next"
                    >
                      Siguiente estudiante
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="lg"
                      onClick={handleRegisterFault}
                      className="tutor-student-card__btn-incident gap-2"
                    >
                      <AlertCircle className="h-5 w-5" />
                      Registrar incidencia
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="tutor-right">
            <div className="tutor-side-card">
              <div className="tutor-side-card__head">
                <CardTitle className="text-base font-semibold">Estado del turno</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hora local Lima y conteo de registros en esta sesión.
                </p>
              </div>
              <div className="tutor-meta">
                <div className="tutor-meta__item">
                  <p className="tutor-meta__k">Hora actual</p>
                  <p className="tutor-meta__v">{nowHHMM || '—:—'}</p>
                </div>
                <div className="tutor-meta__item">
                  <p className="tutor-meta__k">Límite</p>
                  <p className="tutor-meta__v">{arrivalLimit}</p>
                </div>
              </div>
              <div className="tutor-kpis">
                <div className="tutor-kpi">
                  <p className="tutor-kpi__value">{sessionCount.total}</p>
                  <p className="tutor-kpi__label">Total</p>
                </div>
                <div className="tutor-kpi">
                  <p className="tutor-kpi__value">{sessionCount.onTime}</p>
                  <p className="tutor-kpi__label">A tiempo</p>
                </div>
                <div className="tutor-kpi">
                  <p className="tutor-kpi__value">{sessionCount.late}</p>
                  <p className="tutor-kpi__label">Tarde</p>
                </div>
              </div>
            </div>

            <div className="tutor-side-card">
              <div className="tutor-side-card__head">
                <CardTitle className="text-base font-semibold">Últimos escaneos</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Historial rápido (máx. 6).</p>
              </div>
              <div className="tutor-feed">
                {recentScans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aún no hay registros en esta sesión. Escanea el primer carnet para empezar.
                  </p>
                ) : (
                  recentScans.map((row) => (
                    <div key={row.id} className="tutor-feed__row">
                      <span className="tutor-feed__name">{row.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="tutor-feed__time">{row.time}</span>
                        <Badge variant={row.status === 'A tiempo' ? 'success' : row.status === 'Tarde' ? 'warning' : 'secondary'}>
                          {row.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Card className="tutor-instructions">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Instrucciones</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-5">
                <ol>
                  <li>
                    <span className="tutor-instructions__step">1</span>
                    <span>Escanee o ingrese el código de barras del carnet del estudiante.</span>
                  </li>
                  <li>
                    <span className="tutor-instructions__step">2</span>
                    <span>El sistema registrará automáticamente la hora de llegada.</span>
                  </li>
                  <li>
                    <span className="tutor-instructions__step">3</span>
                    <span>
                      Si detecta una falta (uniforme, conducta, etc.), use{' '}
                      <strong className="text-foreground font-medium">Registrar incidencia</strong>.
                    </span>
                  </li>
                  <li>
                    <span className="tutor-instructions__step">4</span>
                    <span>Complete el tipo de falta y guarde el registro.</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Dialog
        open={showIncidentDialog}
        onOpenChange={(open) => {
          setShowIncidentDialog(open);
          if (!open) {
            setSelectedFault('');
            setObservations('');
            focusBarcodeInput();
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Registrar incidencia</DialogTitle>
            <DialogDescription>
              Estudiante: <span className="font-medium text-foreground">{student?.fullName}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo de falta</Label>
              <Select value={selectedFault} onValueChange={setSelectedFault}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar falta" />
                </SelectTrigger>
                <SelectContent>
                  {faults.map((fault) => (
                    <SelectItem key={fault.id} value={fault.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={fault.severity === 'Grave' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {fault.severity}
                        </Badge>
                        <span>{fault.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observaciones (opcional)</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowIncidentDialog(false);
                setSelectedFault('');
                setObservations('');
                focusBarcodeInput();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmitIncident}
              disabled={!selectedFault || registering}
            >
              {registering ? 'Guardando…' : 'Guardar incidencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
