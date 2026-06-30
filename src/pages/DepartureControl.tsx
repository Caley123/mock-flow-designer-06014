import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Search,
  Users,
  CheckCircle,
  Loader2,
  LogOut,
  AlertTriangle,
  Barcode,
} from 'lucide-react';
import {
  StaffKpiStat,
  StaffToolbar,
  StaffDataPanel,
  StaffDataPanelHeader,
  StaffEmptyState,
} from '@/components/staff';
import { Label } from '@/components/ui/label';
import { arrivalService, authService, studentsService } from '@/lib/services';
import type { ArrivalRecord, EducationalLevel } from '@/types';
import { toast } from 'sonner';
import { staffNotify } from '@/lib/utils/staffNotify';

const GRADES = ['1ro', '2do', '3ro', '4to', '5to', '6to'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function getTodayDate() {
  const nowLima = new Date().toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [dd, mm, yyyy] = nowLima.split('/');
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

type DepartureFilter = 'pending' | 'done' | 'all';
type DepartureType = 'Normal' | 'Autorizada';

export const DepartureControl = () => {
  const [records, setRecords] = useState<ArrivalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departureFilter, setDepartureFilter] = useState<DepartureFilter>('pending');
  const [departureType, setDepartureType] = useState<DepartureType>('Normal');
  const [levelFilter, setLevelFilter] = useState<'all' | EducationalLevel>('all');
  const [gradeFilter, setGradeFilter] = useState<'all' | string>('all');
  const [sectionFilter, setSectionFilter] = useState<'all' | string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [registeringId, setRegisteringId] = useState<number | null>(null);
  const isMountedRef = useRef(true);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadArrivals = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    try {
      const { records: arrivals, error } = await arrivalService.getArrivals({ date: selectedDate });

      if (!isMountedRef.current) return;

      if (error) {
        toast.error('Error al cargar registros de asistencia');
        setRecords([]);
      } else {
        setRecords(arrivals);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error en loadArrivals:', error);
      toast.error('Error al procesar los registros');
      setRecords([]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadArrivals();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadArrivals]);

  const handleRegisterDeparture = async (
    recordId: number,
    tipo: DepartureType = departureType,
  ) => {
    if (!isMountedRef.current) return;

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Debe estar autenticado para registrar salidas');
      return;
    }

    setRegisteringId(recordId);
    const { error } = await arrivalService.createDepartureRecord(
      recordId,
      currentUser.id,
      tipo,
    );

    if (!isMountedRef.current) return;
    setRegisteringId(null);

    if (error) {
      toast.error(error);
      return;
    }

    staffNotify.success('Salida registrada', 'El estudiante quedó marcado como retirado');
    void loadArrivals();
    barcodeInputRef.current?.focus();
  };

  const findRecordForStudent = (studentId: number) =>
    records.find((r) => r.student?.id === studentId);

  const handleBarcodeSubmit = async () => {
    const code = barcodeInput.trim();
    if (!code) return;

    setScanning(true);
    try {
      const { student, error } = await studentsService.getByBarcode(code, { skipReincidence: true });

      if (!isMountedRef.current) return;

      if (error || !student) {
        toast.error(error || 'No se encontró estudiante con ese DNI o carnet');
        return;
      }

      const record = findRecordForStudent(student.id);
      if (!record) {
        toast.error('El estudiante no tiene llegada registrada en la fecha seleccionada');
        return;
      }

      if (record.departureTime) {
        toast.info(`${student.fullName} ya tiene salida registrada (${record.departureTime})`);
        setBarcodeInput('');
        return;
      }

      await handleRegisterDeparture(record.id);
      setBarcodeInput('');
    } finally {
      if (isMountedRef.current) {
        setScanning(false);
      }
    }
  };

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const studentName = record.student?.fullName ?? '';
        const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLevel = levelFilter === 'all' || record.student?.level === levelFilter;
        const matchesGrade = gradeFilter === 'all' || record.student?.grade === gradeFilter;
        const matchesSection = sectionFilter === 'all' || record.student?.section === sectionFilter;
        const hasDeparture = Boolean(record.departureTime);
        const matchesDeparture =
          departureFilter === 'all' ||
          (departureFilter === 'pending' && !hasDeparture) ||
          (departureFilter === 'done' && hasDeparture);
        return matchesSearch && matchesLevel && matchesGrade && matchesSection && matchesDeparture;
      }),
    [records, searchTerm, levelFilter, gradeFilter, sectionFilter, departureFilter],
  );

  const stats = useMemo(() => {
    const pending = records.filter((r) => !r.departureTime).length;
    const done = records.filter((r) => r.departureTime).length;
    return { total: records.length, pending, done };
  }, [records]);

  const dateLabel =
    selectedDate === getTodayDate()
      ? 'del día de hoy'
      : `del ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-PE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`;

  return (
    <div className="app-page app-page-shell">
      <PageHeader
        icon={LogOut}
        eyebrow="Asistencia"
        title="Registro de Salidas"
        description={`Marque la salida de estudiantes que ya registraron su llegada ${dateLabel}`}
        accent="warning"
      />

      <div className="app-kpi-grid !grid-cols-1 sm:!grid-cols-3">
        <StaffKpiStat
          label="Pendientes de salida"
          value={stats.pending}
          hint={stats.pending > 0 ? 'Requieren registro' : 'Todo al día'}
          hintIcon={stats.pending > 0 ? AlertTriangle : CheckCircle}
          icon={AlertTriangle}
          tone="warning"
        />
        <StaffKpiStat
          label="Salidas registradas"
          value={stats.done}
          hint={
            stats.total > 0
              ? `${Math.round((stats.done / stats.total) * 100)}% del total`
              : 'Sin llegadas aún'
          }
          hintIcon={CheckCircle}
          icon={LogOut}
          tone="success"
        />
        <StaffKpiStat
          label="Total con llegada"
          value={stats.total}
          icon={Users}
          tone="primary"
        />
      </div>

      <StaffDataPanel>
        <StaffDataPanelHeader
          title="Escaneo rápido"
          description="Escanee el carnet o escriba el DNI y presione Enter"
        />
        <div className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative min-w-0 flex-1 space-y-2">
              <Label htmlFor="departure-barcode">Carnet / DNI</Label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={barcodeInputRef}
                  id="departure-barcode"
                  placeholder="Escanee o escriba el DNI del estudiante..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleBarcodeSubmit();
                    }
                  }}
                  className="pl-10"
                  autoComplete="off"
                  disabled={scanning || registeringId !== null}
                />
              </div>
            </div>
            <div className="space-y-2 sm:w-44">
              <Label>Tipo de salida</Label>
              <Select
                value={departureType}
                onValueChange={(v) => setDepartureType(v as DepartureType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Autorizada">Autorizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => void handleBarcodeSubmit()}
              disabled={!barcodeInput.trim() || scanning || registeringId !== null}
              className="gap-2 sm:mb-0"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Registrar salida
            </Button>
          </div>
        </div>
      </StaffDataPanel>

      <StaffToolbar title="Filtros" description="Fecha, estudiante, nivel y estado de salida">
        <div className="col-span-full grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={getTodayDate()}
            />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label>Buscar estudiante</Label>
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nombre completo del estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-w-[12rem] pl-10"
              />
            </div>
          </div>
        </div>
        <div className="col-span-full grid gap-3 grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>Estado salida</Label>
            <Select
              value={departureFilter}
              onValueChange={(v) => setDepartureFilter(v as DepartureFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="done">Con salida</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nivel</Label>
            <Select
              value={levelFilter}
              onValueChange={(v) => setLevelFilter(v as 'all' | EducationalLevel)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nivel educativo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Primaria">Primaria</SelectItem>
                <SelectItem value="Secundaria">Secundaria</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grado</Label>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {GRADES.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sección</Label>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {SECTIONS.map((section) => (
                  <SelectItem key={section} value={section}>
                    {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </StaffToolbar>

      <StaffDataPanel>
        <StaffDataPanelHeader
          title="Estudiantes del día"
          description={`${filteredRecords.length} visibles · ${departureFilter === 'pending' ? 'solo pendientes' : departureFilter === 'done' ? 'con salida' : 'todos'}`}
          action={
            <Button onClick={() => void loadArrivals()} variant="outline" size="sm" disabled={loading}>
              Actualizar
            </Button>
          }
        />
        <div className="p-4 pt-0 sm:p-5 sm:pt-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Cargando registros...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <StaffEmptyState
              icon={Users}
              title={
                departureFilter === 'pending'
                  ? 'Sin salidas pendientes'
                  : 'Sin registros'
              }
              description={
                departureFilter === 'pending'
                  ? 'Todos los estudiantes con llegada ya tienen salida registrada'
                  : 'No hay registros para la fecha o filtros seleccionados'
              }
            />
          ) : (
            <div className="app-table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Nivel / Grado</TableHead>
                    <TableHead>Hora llegada</TableHead>
                    <TableHead>Hora salida</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.student?.fullName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="font-semibold">{record.student?.level}</span>
                          <span className="text-muted-foreground">
                            {record.student?.grade} - {record.student?.section}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {record.arrivalTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.departureTime ? (
                          <div className="flex items-center gap-2">
                            <LogOut className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{record.departureTime}</span>
                            {record.departureType === 'Autorizada' && (
                              <Badge variant="outline" className="text-xs">
                                Autorizada
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">Pendiente</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={record.status === 'A tiempo' ? 'default' : 'destructive'}
                          className={
                            record.status === 'A tiempo'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                          }
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!record.departureTime ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={registeringId === record.id}
                              onClick={() => void handleRegisterDeparture(record.id, 'Normal')}
                              className="gap-1"
                            >
                              {registeringId === record.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <LogOut className="h-4 w-4" />
                              )}
                              Normal
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={registeringId === record.id}
                              onClick={() => void handleRegisterDeparture(record.id, 'Autorizada')}
                            >
                              Autorizada
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Completado</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </StaffDataPanel>
    </div>
  );
};
