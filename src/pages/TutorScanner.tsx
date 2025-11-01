import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scan, Clock, AlertCircle, CheckCircle, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { studentsService, faultsService, incidentsService, authService } from '@/lib/services';
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

    try {
      const { student: foundStudent, error } = await studentsService.getByBarcode(barcode);

      if (error || !foundStudent) {
        toast.error('Estudiante no encontrado');
        setBarcode('');
        setScanning(false);
        return;
      }

      setStudent(foundStudent);
      
      // Registrar hora de llegada (esto se implementará con una función de Supabase)
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      toast.success(
        <div>
          <p className="font-bold">{foundStudent.fullName}</p>
          <p className="text-sm">Hora de llegada: {timeStr}</p>
          <p className="text-sm">{foundStudent.grade} - {foundStudent.section}</p>
        </div>,
        { duration: 5000 }
      );

      // Limpiar el código de barras después de 3 segundos
      setTimeout(() => {
        setBarcode('');
        setStudent(null);
      }, 3000);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background">
      {/* Header */}
      <div className="bg-sidebar border-b border-sidebar-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">Control de Asistencia</h1>
            <p className="text-sm text-muted-foreground">{user?.fullName} - {user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="w-6 h-6" />
              Escanear Carnet
            </CardTitle>
            <CardDescription>
              Escanee o ingrese el código de barras del estudiante
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleScan} className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Código de barras del estudiante"
                  className="text-lg h-14 pr-12"
                  autoFocus
                  disabled={scanning}
                />
                <Scan className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={scanning || !barcode.trim()}
              >
                {scanning ? 'Procesando...' : 'Registrar Llegada'}
              </Button>
            </form>

            {student && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
                  <div className="flex-1">
                    <p className="font-bold text-lg">{student.fullName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{student.grade} - {student.section}</Badge>
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Register Fault Button */}
        {student && (
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertCircle className="w-6 h-6" />
                ¿Detectó alguna falta?
              </CardTitle>
              <CardDescription>
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
