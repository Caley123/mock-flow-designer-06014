import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, GraduationCap, LogOut, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  authService,
  faultsService,
  incidentsService,
  evidenceService,
  studentsService,
} from '@/lib/services';
import type { DocenteClassroom, FaultType, Student } from '@/types';
import { GuardyMark } from '@/components/brand/GuardyMark';
import { StudentPhoto } from '@/components/shared/StudentPhoto';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { ClassroomPickerGrid } from '@/components/incident-scanner/ClassroomPickerGrid';
import { ClassroomStudentList } from '@/components/incident-scanner/ClassroomStudentList';
import { CategoryFaultGrid } from '@/components/incident-scanner/CategoryFaultGrid';
import { IncidentSessionSidebar, type SessionIncidentRow } from '@/components/incident-scanner/IncidentSessionSidebar';
import { IncidentConfirmDialog } from '@/components/incident-scanner/IncidentConfirmDialog';
import { EvidenceQuickUpload } from '@/components/incident-scanner/EvidenceQuickUpload';
import { useTutorTouchLayout } from '@/hooks/useTutorTouchLayout';
import { useInvalidateIncidents } from '@/hooks/queries/useIncidentsQuery';
import { useInvalidateStudents } from '@/hooks/queries/useStudentsQuery';
import { queryKeys } from '@/lib/query/queryKeys';
import { parseDocenteAssignments, formatClassroomLabel } from '@/lib/utils/docenteAssignments';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type ViewStep = 'classrooms' | 'students' | 'incident';

export const TeacherIncidentScanner = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidateIncidents = useInvalidateIncidents();
  const invalidateStudents = useInvalidateStudents();
  const user = authService.getCurrentUser();
  const touchTablet = useTutorTouchLayout();

  const assignedClassrooms = useMemo(
    () => parseDocenteAssignments(user?.gradosAsignados).classrooms,
    [user?.gradosAsignados],
  );

  const [view, setView] = useState<ViewStep>('classrooms');
  const [selectedClassroom, setSelectedClassroom] = useState<DocenteClassroom | null>(null);
  const [classroomStudents, setClassroomStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [faults, setFaults] = useState<FaultType[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [selectedFaultId, setSelectedFaultId] = useState<number | null>(null);
  const [observations, setObservations] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [sessionCount, setSessionCount] = useState(0);
  const [recentIncidents, setRecentIncidents] = useState<SessionIncidentRow[]>([]);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void faultsService.getAll().then(({ faults: loaded, error }) => {
      if (error) toast.error(error);
      else setFaults(loaded);
    });
  }, []);

  const selectedFault = useMemo(
    () => faults.find((f) => f.id === selectedFaultId) ?? null,
    [faults, selectedFaultId],
  );

  const stepLabel =
    view === 'classrooms'
      ? 'Elegir salón'
      : view === 'students'
        ? 'Elegir estudiante'
        : !selectedFaultId
          ? 'Elegir falta'
          : 'Revisar y confirmar';

  const loadClassroomStudents = useCallback(async (classroom: DocenteClassroom) => {
    setLoadingStudents(true);
    setSelectedClassroom(classroom);
    setClassroomStudents([]);
    setView('students');

    const { students, error } = await studentsService.listForDocenteClassroom(classroom);
    if (!isMountedRef.current) return;

    if (error) {
      toast.error(error);
      setView('classrooms');
      setSelectedClassroom(null);
    } else {
      setClassroomStudents(students);
    }
    setLoadingStudents(false);
  }, []);

  const resetIncidentForm = useCallback(() => {
    setStudent(null);
    setSelectedFaultId(null);
    setObservations('');
    setEvidenceFiles([]);
    setEvidencePreviews([]);
    setShowConfirm(false);
  }, []);

  const selectStudent = useCallback((found: Student) => {
    setStudent(found);
    setSelectedFaultId(null);
    setObservations('');
    setEvidenceFiles([]);
    setEvidencePreviews([]);
    setView('incident');
  }, []);

  const goBackToClassrooms = () => {
    resetIncidentForm();
    setSelectedClassroom(null);
    setClassroomStudents([]);
    setView('classrooms');
  };

  const goBackToStudents = () => {
    resetIncidentForm();
    setView('students');
  };

  const handleContinue = () => {
    if (!student) {
      toast.error('Seleccione un estudiante');
      return;
    }
    if (!selectedFaultId) {
      toast.error('Seleccione una falta');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmRegister = async () => {
    if (!student || !selectedFaultId || !isMountedRef.current) return;

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Sesión expirada');
      return;
    }

    setRegistering(true);
    try {
      const { incident, error } = await incidentsService.create(
        {
          studentId: student.id,
          faultTypeId: selectedFaultId,
          registeredBy: currentUser.id,
          observations: observations.trim() || undefined,
        },
        { minimal: true },
      );

      if (!isMountedRef.current) return;
      if (error || !incident) {
        toast.error(error || 'No se pudo registrar la incidencia');
        return;
      }

      if (evidenceFiles.length > 0) {
        const results = await Promise.all(
          evidenceFiles.map((file) => evidenceService.upload(incident.id, file, currentUser.id)),
        );
        const uploadErrors = results.filter((r) => r.error);
        if (uploadErrors.length > 0) {
          toast.warning(`${uploadErrors.length} foto(s) no se subieron`);
        }
      }

      const faultName = selectedFault?.name ?? 'Incidencia';
      const timeLabel = format(new Date(), 'HH:mm');
      setSessionCount((c) => c + 1);
      setRecentIncidents((prev) => [
        { id: incident.id, studentName: student.fullName, faultName, time: timeLabel },
        ...prev,
      ].slice(0, 6));

      toast.success(`Incidencia registrada · ${student.fullName}`);
      invalidateIncidents();
      invalidateStudents();
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.recentIncidents() });
      resetIncidentForm();
      setView('students');
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar incidencia');
    } finally {
      if (isMountedRef.current) setRegistering(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login?role=docente');
  };

  return (
    <div className={cn('tutor-page', touchTablet && 'tutor-page--touch')}>
      <header className="tutor-header">
        <div className="tutor-header__inner">
          <div className="tutor-header__brand">
            <div className="tutor-header__shield p-1" aria-hidden>
              <GuardyMark size="sm" />
            </div>
            <div className="min-w-0">
              <p className="tutor-header__title">Registro de incidencias</p>
              <p className="tutor-header__subtitle hidden sm:block">SIE — Docente</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-xs">{stepLabel}</Badge>
            <span className="tutor-header__user hidden sm:inline">{user?.fullName}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleLogout()}
              className="tutor-header__logout border-[var(--tutor-lead)] bg-transparent text-[var(--tutor-starlight)] hover:bg-[var(--tutor-graphite)]"
            >
              <LogOut className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="tutor-main">
        <div className="tutor-grid">
          <section className="tutor-left space-y-4">
            {view === 'classrooms' && (
              <Card className="tutor-scan-card">
                <div className="tutor-scan-card__head">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h2 className="text-lg font-semibold sm:text-2xl">Mis salones</h2>
                      <p className="text-sm text-muted-foreground">
                        Elija un salón para ver la lista de estudiantes.
                      </p>
                    </div>
                  </div>
                </div>
                <ClassroomPickerGrid
                  classrooms={assignedClassrooms}
                  onSelect={(c) => void loadClassroomStudents(c)}
                />
              </Card>
            )}

            {view === 'students' && selectedClassroom && (
              <Card className="tutor-scan-card">
                <div className="tutor-scan-card__head">
                  <div className="flex items-start gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 mt-0.5"
                      onClick={goBackToClassrooms}
                      aria-label="Volver a salones"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0 space-y-1">
                      <h2 className="text-lg font-semibold sm:text-2xl">
                        {formatClassroomLabel(selectedClassroom)}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Seleccione un estudiante para registrar una incidencia.
                      </p>
                    </div>
                  </div>
                </div>
                <ClassroomStudentList
                  students={classroomStudents}
                  loading={loadingStudents}
                  onSelectStudent={selectStudent}
                />
              </Card>
            )}

            {view === 'incident' && student && (
              <>
                <Card className="tutor-scan-card">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={goBackToStudents}
                        aria-label="Volver a lista de estudiantes"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <StudentPhoto
                        src={student.profilePhoto}
                        name={student.fullName}
                        className="h-16 w-16 rounded-2xl shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold leading-tight">{student.fullName}</h2>
                          {(student.reincidenceLevel ?? 0) > 0 && (
                            <ReincidenceBadge level={student.reincidenceLevel ?? 0} short />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {student.level} · {student.grade} — Sección {student.section}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={goBackToStudents}
                        aria-label="Cambiar estudiante"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="tutor-scan-card">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3">Tipo de falta</h3>
                      <CategoryFaultGrid
                        faults={faults}
                        selectedFaultId={selectedFaultId}
                        onSelectFault={setSelectedFaultId}
                        disabled={registering}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Observaciones (opcional)</Label>
                      <Textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className="resize-none"
                        disabled={registering}
                      />
                    </div>

                    <EvidenceQuickUpload
                      files={evidenceFiles}
                      previews={evidencePreviews}
                      onChange={(files, previews) => {
                        setEvidenceFiles(files);
                        setEvidencePreviews(previews);
                      }}
                      disabled={registering}
                    />

                    <Button
                      type="button"
                      className="w-full"
                      size="lg"
                      onClick={handleContinue}
                      disabled={!selectedFaultId || registering}
                    >
                      Continuar
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </section>

          <aside className="tutor-right hidden lg:block">
            <IncidentSessionSidebar sessionCount={sessionCount} recentIncidents={recentIncidents} />
          </aside>
        </div>
      </main>

      <IncidentConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        student={student}
        fault={selectedFault}
        observations={observations}
        evidenceCount={evidenceFiles.length}
        registering={registering}
        onConfirm={() => void handleConfirmRegister()}
      />
    </div>
  );
};
