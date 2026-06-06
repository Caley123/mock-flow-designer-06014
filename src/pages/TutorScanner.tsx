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
  Search,
  Loader2,
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
import { getLimaNow } from '@/lib/utils/limaDateTime';
import type { CreateArrivalOptions } from '@/lib/services/arrivalService';

export const TutorScanner = () => {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [nameSearchResults, setNameSearchResults] = useState<Student[]>([]);
  const [nameSearching, setNameSearching] = useState(false);
  const [lookupPending, setLookupPending] = useState(false);
  const [scanAnnouncement, setScanAnnouncement] = useState('');
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
  const barcodeIndexRef = useRef<Map<string, Student>>(new Map());
  const syncGenerationRef = useRef(0);

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
    void studentsService.prefetchBarcodeIndex().then((map) => {
      if (!isMountedRef.current) return;
      barcodeIndexRef.current = map;
    });
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

  useEffect(() => {
    if (nameSearch.trim().length < 2) {
      setNameSearchResults([]);
      setNameSearching(false);
      return;
    }

    let cancelled = false;
    setNameSearching(true);

    const timeoutId = window.setTimeout(async () => {
      const { students, error } = await studentsService.searchByName(nameSearch.trim(), 8);
      if (cancelled || !isMountedRef.current) return;
      if (!error) setNameSearchResults(students);
      setNameSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [nameSearch]);

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

  const computeArrivalSnapshot = useCallback(() => {
    const { date, time } = getLimaNow();
    const status: ArrivalRecord['status'] =
      time <= arrivalLimit ? 'A tiempo' : 'Tarde';
    return { date, time, status };
  }, [arrivalLimit]);

  const applyScanSuccess = useCallback(
    (studentToShow: Student, record: ArrivalRecord) => {
      setStudent(studentToShow);
      setArrivalRecord(record);
      setShowStudentProfile(true);

      const status = record.status || 'Registrado';
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
            time: record.arrivalTime ?? nowHHMM,
            status,
          },
          ...prev,
        ];
        return next.slice(0, 6);
      });
      setScanAnnouncement(
        `${studentToShow.fullName} registrado: ${status}, hora ${record.arrivalTime ?? nowHHMM}`
      );
    },
    [nowHHMM]
  );

  const persistArrivalInBackground = useCallback(
    (studentToShow: Student, arrivalOpts: CreateArrivalOptions, syncGen: number) => {
      const currentUser = authService.getCurrentUser();
      void arrivalService
        .createArrivalRecord(studentToShow.id, currentUser?.id, arrivalOpts)
        .then(({ record, error: arrivalError }) => {
          if (!isMountedRef.current || syncGenerationRef.current !== syncGen) return;

          if (arrivalError || !record) {
            console.error('Error al registrar llegada:', arrivalError);
            toast.error('No se guardó la llegada en el servidor. Vuelva a escanear.');
            setShowStudentProfile(false);
            setStudent(null);
            setArrivalRecord(null);
            focusBarcodeInput();
            return;
          }

          setArrivalRecord(record);

          if (whatsappService.isEnabled()) {
            void whatsappService.notifyParentArrival(studentToShow, record).then((wa) => {
              if (!isMountedRef.current) return;
              if (!wa.ok && wa.error) {
                toast.warning(`WhatsApp: ${wa.error}`, { duration: 2800 });
              }
            });
          }
        });
    },
    [focusBarcodeInput]
  );

  const resolveStudentByBarcode = useCallback(
    async (code: string): Promise<Student | null> => {
      const fromIndex = studentsService.lookupBarcodeInIndex(barcodeIndexRef.current, code);
      if (fromIndex) return fromIndex;

      setLookupPending(true);
      try {
        const { student, error } = await studentsService.getByBarcode(code, {
          skipReincidence: true,
        });
        if (student) {
          barcodeIndexRef.current.set(code, student);
          return student;
        }
        if (error) console.warn('getByBarcode:', error);
        return null;
      } finally {
        if (isMountedRef.current) setLookupPending(false);
      }
    },
    []
  );

  const processStudent = useCallback(
    (foundStudent: Student) => {
      if (!isMountedRef.current) return;

      focusBarcodeInput();

      const { date, time, status } = computeArrivalSnapshot();
      const arrivalOpts: CreateArrivalOptions = {
        date,
        arrivalTime: time,
        status,
      };

      if (foundStudent.barcode?.trim()) {
        barcodeIndexRef.current.set(foundStudent.barcode.trim(), foundStudent);
      }

      const optimisticRecord: ArrivalRecord = {
        id: 0,
        studentId: foundStudent.id,
        date,
        arrivalTime: time,
        status,
        createdAt: new Date().toISOString(),
      };

      const syncGen = ++syncGenerationRef.current;
      applyScanSuccess(foundStudent, optimisticRecord);
      persistArrivalInBackground(foundStudent, arrivalOpts, syncGen);
    },
    [
      applyScanSuccess,
      computeArrivalSnapshot,
      focusBarcodeInput,
      persistArrivalInBackground,
    ]
  );

  const processScanCode = useCallback(
    async (rawInput: string) => {
      const raw = rawInput.replace(/\r?\n/g, '').trim();
      if (!raw || !isMountedRef.current) {
        if (!raw) toast.error('Ingrese un código de barras');
        return;
      }

      let foundStudent = studentsService.lookupBarcodeInIndex(barcodeIndexRef.current, raw);

      if (!foundStudent) {
        foundStudent = await resolveStudentByBarcode(raw);
        if (!isMountedRef.current) return;
      }

      if (!foundStudent) {
        toast.error('Estudiante no encontrado');
        focusBarcodeInput();
        return;
      }

      processStudent(foundStudent);
    },
    [focusBarcodeInput, processStudent, resolveStudentByBarcode]
  );

  const handleNameSearchSelect = (selected: Student) => {
    setNameSearch('');
    setNameSearchResults([]);
    processStudent(selected);
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcode;
    setBarcode('');
    void processScanCode(code);
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (/[\r\n]/.test(v)) {
      const code = v.replace(/\r?\n/g, '').trim();
      setBarcode('');
      if (code) void processScanCode(code);
      return;
    }
    setBarcode(v);
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
    setNameSearch('');
    setNameSearchResults([]);
    setStudent(null);
    setShowStudentProfile(false);
    setArrivalRecord(null);
    focusBarcodeInput();
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      clearScan();
    }
  };

  const closeStudentProfile = () => {
    setShowStudentProfile(false);
    setStudent(null);
    setArrivalRecord(null);
    setBarcode('');
    setNameSearch('');
    setNameSearchResults([]);
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
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {scanAnnouncement}
      </div>
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

      <main id="main-content" className="tutor-main">
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
                      Escanear código o buscar por nombre
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Carnet con lector de barras o búsqueda manual por nombre del estudiante.
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-5 sm:p-7 pt-5 sm:pt-6">
                <form
                  onSubmit={handleScan}
                  className="space-y-5"
                  aria-busy={lookupPending}
                  aria-label="Registro de llegada por código de barras o nombre"
                >
                  <div className="space-y-2">
                    <Label htmlFor="barcode-input" className="text-sm font-medium text-foreground">
                      Código de barras
                    </Label>
                    <Input
                      ref={barcodeInputRef}
                      id="barcode-input"
                      type="text"
                      value={barcode}
                      onChange={handleBarcodeChange}
                      onKeyDown={handleBarcodeKeyDown}
                      autoComplete="off"
                      autoFocus
                      placeholder="Escanee o escriba el código…"
                      aria-describedby="barcode-scan-hint"
                      className="tutor-scan-input"
                    />
                    <div id="barcode-scan-hint" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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

                  <div className="relative space-y-2">
                    <Label htmlFor="name-search-input" className="text-sm font-medium text-foreground">
                      Búsqueda por nombre
                    </Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name-search-input"
                        type="search"
                        value={nameSearch}
                        onChange={(e) => setNameSearch(e.target.value)}
                        placeholder="Escriba al menos 2 letras del nombre…"
                        autoComplete="off"
                        disabled={lookupPending}
                        className="pl-9"
                        aria-describedby="name-search-hint"
                        aria-expanded={nameSearchResults.length > 0}
                        aria-controls="name-search-results"
                      />
                      {nameSearching && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <p id="name-search-hint" className="text-xs text-muted-foreground">
                      Seleccione un resultado para registrar la llegada sin escanear.
                    </p>
                    {nameSearchResults.length > 0 && (
                      <div
                        id="name-search-results"
                        role="listbox"
                        className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg"
                      >
                        {nameSearchResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            role="option"
                            onClick={() => handleNameSearchSelect(result)}
                            className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                          >
                            <span className="font-medium text-foreground">{result.fullName}</span>
                            <span className="text-sm text-muted-foreground">
                              {result.level} · {result.grade} {result.section}
                              {result.barcode ? ` · ${result.barcode}` : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearScan}
                      disabled={lookupPending}
                      className="sm:min-w-[120px]"
                    >
                      Limpiar
                    </Button>
                    <Button
                      type="submit"
                      disabled={lookupPending || !barcode.trim()}
                      className="sm:min-w-[180px]"
                    >
                      {lookupPending ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          Buscando…
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
                    <span>
                      Escanee el código de barras del carnet o busque al estudiante por nombre.
                    </span>
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
