import { useState, useEffect, useRef } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Barcode, Clock, AlertCircle, CheckCircle, LogOut, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { studentsService, faultsService, incidentsService, authService, arrivalService } from '@/lib/services';
import { Student, FaultType } from '@/types';
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

export const TutorScanner = () => {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [faults, setFaults] = useState<FaultType[]>([]);
  const [selectedFault, setSelectedFault] = useState<string>('');
  const [observations, setObservations] = useState('');
  const [registering, setRegistering] = useState(false);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [arrivalRecord, setArrivalRecord] = useState<any>(null);

  const user = authService.getCurrentUser();

  useEffect(() => {
    loadFaults();
  }, []);

  const loadFaults = async () => {
    const { faults: faultsList } = await faultsService.getAll(true);
    setFaults(faultsList);
  };

  const handleLogout = async () => {
    await authService.logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barcode.trim()) {
      toast.error('Ingrese un código de barras');
      return;
    }

    setScanning(true);
    setStudent(null);
    setShowStudentProfile(false);

    try {
      const { student: foundStudent, error } = await studentsService.getByBarcode(barcode);

      if (error || !foundStudent) {
        toast.error('Estudiante no encontrado');
        setBarcode('');
        setScanning(false);
        return;
      }

      // Registrar hora de llegada en la base de datos
      const currentUser = authService.getCurrentUser();
      const { record, error: arrivalError } = await arrivalService.createArrivalRecord(
        foundStudent.id,
        currentUser?.id
      );

      if (arrivalError) {
        console.error('Error al registrar llegada:', arrivalError);
        toast.error('Error al registrar la llegada');
        setBarcode('');
        setScanning(false);
        return;
      }

      // Actualizar el estado con el estudiante y su registro de llegada
      setStudent(foundStudent);
      setArrivalRecord(record);
      setShowStudentProfile(true);
      
      // Enfocar automáticamente el campo de código de barras para el siguiente escaneo
      const barcodeInput = document.getElementById('barcode-input') as HTMLInputElement;
      if (barcodeInput) {
        barcodeInput.focus();
      }

    } catch (error: any) {
      console.error('Error al escanear:', error);
      toast.error('Error al procesar el escaneo');
    } finally {
      setScanning(false);
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
    if (!student || !selectedFault) {
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

      const { incident, error } = await incidentsService.create({
        id_estudiante: student.id,
        id_falta: parseInt(selectedFault),
        id_usuario_registro: currentUser.id,
        observaciones: observations.trim() || null,
      });

      if (error) {
        toast.error(error);
      } else {
        toast.success('Incidencia registrada exitosamente');
        setShowIncidentDialog(false);
        setSelectedFault('');
        setObservations('');
        setStudent(null);
        setBarcode('');
      }
    } catch (error) {
      toast.error('Error al registrar incidencia');
    } finally {
      setRegistering(false);
    }
  };

  // Cerrar el perfil del estudiante
  const closeStudentProfile = () => {
    setShowStudentProfile(false);
    setStudent(null);
    setBarcode('');
  };

  // Efecto para limpiar el código de barras cuando se cierra el perfil
  useEffect(() => {
    if (!showStudentProfile) {
      setBarcode('');
    }
  }, [showStudentProfile]);

  // Animaciones con react-spring
  const cardAnimation = useSpring({
    opacity: showStudentProfile ? 1 : 0,
    transform: showStudentProfile ? 'translateY(0)' : 'translateY(20px)',
    config: { tension: 300, friction: 30 }
  });

  const buttonHover = useSpring({
    scale: 1,
    from: { scale: 0.98 },
    config: { tension: 300, friction: 10 }
  });

  // Paleta de colores del Colegio San Ramón
  const colors = {
    guinda: '#800020',
    azulMarino: '#1E3A8A',
    dorado: '#D4AF37',
    blanco: '#FFFFFF',
    grisClaro: '#F3F4F6',
    guindaClaro: '#A00030',
    naranja: '#F59E0B',
    naranjaClaro: '#FEF3C7'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-sand to-beige relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
      </div>
      
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary-dark to-primary shadow-2xl border-b-4 border-accent relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-white to-cream p-3 rounded-xl shadow-xl border-2 border-accent/40">
              <Barcode className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">Control de Asistencia</h1>
              <p className="text-sm text-accent-light font-medium">Colegio San Ramón • 60 años</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-white bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 font-medium">{user?.fullName}</span>
            <Button
              size="sm"
              onClick={handleLogout}
              className="bg-accent hover:bg-accent-dark text-foreground hover:text-white border-2 border-accent-dark hover:border-accent-light transition-all duration-300 font-bold shadow-lg"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6 relative z-10">
        {/* Scanner Card */}
        <Card className="mb-6 border-2 border-accent shadow-2xl overflow-hidden bg-white/95 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-br from-primary via-primary-dark to-primary text-white p-6 relative overflow-hidden">
            {/* Patrón decorativo */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 border-4 border-accent rounded-full -translate-y-12 translate-x-12"></div>
            </div>
            
            <CardTitle className="flex items-center gap-3 text-white relative">
              <div className="bg-accent/20 p-2 rounded-full border-2 border-accent/40">
                <Barcode className="w-6 h-6 text-accent-light" />
              </div>
              Escanear Código de Barras
            </CardTitle>
            <CardDescription className="text-accent-light font-medium">
              Escanee el código de barras del estudiante para registrar su asistencia
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-b from-white to-cream/20">
            <form onSubmit={handleScan} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="barcode-input" className="text-base font-bold text-foreground">Código de Barras</Label>
                <Input
                  id="barcode-input"
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Escanee o ingrese el código de barras"
                  autoComplete="off"
                  autoFocus
                  disabled={scanning}
                  className="text-lg font-mono tracking-wider h-14 border-2 border-warm-gray focus:border-primary focus:ring-4 focus:ring-primary/20 bg-white shadow-sm"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBarcode('');
                    setStudent(null);
                    setShowStudentProfile(false);
                  }}
                  disabled={scanning}
                  className="border-2 border-warm-gray hover:bg-warm-gray/50"
                >
                  Limpiar
                </Button>
                <Button
                  type="submit"
                  disabled={scanning || !barcode}
                  className="bg-gradient-to-r from-primary via-primary-dark to-primary hover:from-primary-dark hover:to-primary text-white font-bold px-8 shadow-lg hover:shadow-2xl transition-all border-2 border-accent/30"
                >
                  {scanning ? (
                    <>
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                      Escaneando...
                    </>
                  ) : (
                    <>
                      <Barcode className="w-5 h-5 mr-2" />
                      Escanear
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Perfil del Estudiante */}
        {showStudentProfile && student && (
          <animated.div style={cardAnimation}>
            <Card className="relative mb-6 border-2 border-primary shadow-2xl overflow-hidden bg-gradient-to-br from-white to-cream/30">
              <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-primary via-accent to-primary-dark"></div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-10 w-10 rounded-full text-muted hover:bg-warm-gray/50 border-2 border-transparent hover:border-accent"
                onClick={() => setShowStudentProfile(false)}
              >
                <X className="h-6 w-6" />
                <span className="sr-only">Cerrar</span>
              </Button>
              <CardHeader className="pb-2 pt-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {student.profilePhoto ? (
                      <img
                        src={student.profilePhoto}
                        alt={student.fullName}
                        className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                        <User className="w-8 h-8 text-primary" />
                      </div>
                    )}
                    <Badge 
                      variant={arrivalRecord?.status === 'A tiempo' ? 'default' : 'secondary'}
                      className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
                    >
                      {arrivalRecord?.status || 'Pendiente'}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-[#1E3A8A]">
                      {student.fullName}
                    </CardTitle>
                    <CardDescription className="text-base text-gray-600 mt-1">
                      {student.grade}° {student.section}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-6">
                <div className="grid gap-6">
                  <div className="flex items-start gap-6">
                    <div className="h-20 w-20 rounded-full border-2 border-[#D4AF37] p-0.5">
                      {student.profilePhoto ? (
                        <img
                          src={student.profilePhoto}
                          alt={student.fullName}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#800020] flex items-center justify-center">
                          <User className="h-8 w-8 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="bg-[#F3F4F6] p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Código</p>
                            <p className="font-mono text-sm">{student.barcode || '--'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Hora de llegada</p>
                            <p className="font-medium">{arrivalRecord?.arrivalTime || '--:--'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <animated.div 
                      style={{
                        transform: buttonHover.scale.to(scale => `scale(${scale})`),
                        display: 'inline-block'
                      }}
                      onMouseEnter={() => buttonHover.scale.start(1.05)}
                      onMouseLeave={() => buttonHover.scale.start(1)}
                    >
                      <Button
                        onClick={() => setShowIncidentDialog(true)}
                        className="gap-2 bg-[#800020] hover:bg-[#A00030] text-white border border-[#D4AF37] hover:border-[#D4AF37] transition-all duration-200 shadow-sm"
                      >
                      <AlertCircle className="h-4 w-4 text-[#D4AF37]" />
                      Registrar Incidencia
                      </Button>
                    </animated.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </animated.div>
        )}

        {/* Register Fault Button */}
        <animated.div style={{
          opacity: showStudentProfile ? 1 : 0,
          transform: showStudentProfile ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.3s ease-out'
        }}>
          {student && showStudentProfile && (
            <Card className="border-2 border-[#F59E0B] bg-[#FEF3C7] mt-4 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                ¿Detectó alguna falta?
              </CardTitle>
              <CardDescription className="text-orange-700">
                Si el estudiante presenta alguna falta, puede registrarla aquí
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleRegisterFault}
                variant="outline"
                className="w-full border-orange-300 hover:bg-orange-50 dark:border-orange-700 dark:hover:bg-orange-950/30"
              >
                Registrar Incidencia
              </Button>
            </CardContent>
            </Card>
          )}
        </animated.div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Escanee o ingrese el código de barras del carnet del estudiante</p>
            <p>2. El sistema registrará automáticamente la hora de llegada</p>
            <p>3. Si detecta alguna falta (uniforme, conducta, etc.), presione "Registrar Incidencia"</p>
            <p>4. Complete la información de la incidencia y guarde</p>
          </CardContent>
        </Card>
      </div>

      {/* Incident Dialog */}
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Incidencia</DialogTitle>
            <DialogDescription>
              Estudiante: <strong>{student?.fullName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Falta</Label>
              <Select value={selectedFault} onValueChange={setSelectedFault}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar falta" />
                </SelectTrigger>
                <SelectContent>
                  {faults.map((fault) => (
                    <SelectItem key={fault.id} value={fault.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Badge variant={fault.severity === 'Grave' ? 'destructive' : 'secondary'}>
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
                placeholder="Describa brevemente la situación..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowIncidentDialog(false);
                setSelectedFault('');
                setObservations('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmitIncident} disabled={!selectedFault || registering}>
              {registering ? 'Guardando...' : 'Guardar Incidencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
