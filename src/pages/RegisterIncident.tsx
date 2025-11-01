import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Student, FaultType } from '@/types';
import { Barcode, Search, AlertTriangle, Upload, Save, X, Loader2 } from 'lucide-react';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getReincidenceLevelDescription, getSuggestedAction } from '@/lib/utils/reincidenceUtils';
import { toast } from 'sonner';
import { studentsService, faultsService, incidentsService, evidenceService } from '@/lib/services';
import { authService } from '@/lib/services';

export const RegisterIncident = () => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFault, setSelectedFault] = useState<string>('');
  const [observations, setObservations] = useState('');
  const [showReincidenceAlert, setShowReincidenceAlert] = useState(false);
  const [faults, setFaults] = useState<FaultType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Cargar faltas al montar el componente
  useEffect(() => {
    const loadFaults = async () => {
      const { faults: faultList, error } = await faultsService.getAll(true);
      if (error) {
        toast.error('Error al cargar catálogo de faltas');
      } else {
        setFaults(faultList);
      }
    };
    loadFaults();
  }, []);

  // Búsqueda de estudiantes por nombre
  useEffect(() => {
    if (searchInput.length >= 2) {
      const searchStudents = async () => {
        setSearching(true);
        const { students, error } = await studentsService.searchByName(searchInput, 10);
        if (!error) {
          setSearchResults(students);
        }
        setSearching(false);
      };
      
      const timeoutId = setTimeout(searchStudents, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchInput]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    setLoading(true);
    const { student, error } = await studentsService.getByBarcode(barcodeInput.trim());
    
    if (error || !student) {
      toast.error('Código de barras no encontrado');
      setBarcodeInput('');
      setLoading(false);
      return;
    }

    setSelectedStudent(student);
    if (student.reincidenceLevel && student.reincidenceLevel >= 2) {
      setShowReincidenceAlert(true);
    }
    toast.success(`Estudiante encontrado: ${student.fullName}`);
    setBarcodeInput('');
    setLoading(false);
  };

  const handleSearchSelect = async (studentId: string) => {
    const { student, error } = await studentsService.getById(parseInt(studentId));
    if (error || !student) {
      toast.error('Error al cargar estudiante');
      return;
    }
    
    setSelectedStudent(student);
    if (student.reincidenceLevel && student.reincidenceLevel >= 2) {
      setShowReincidenceAlert(true);
    }
    setSearchInput('');
    setSearchResults([]);
  };

  const handleSave = async () => {
    if (!selectedStudent || !selectedFault) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Debe iniciar sesión para registrar incidencias');
      return;
    }

    setLoading(true);

    try {
      const { incident, error } = await incidentsService.create({
        id_estudiante: selectedStudent.id,
        id_falta: parseInt(selectedFault),
        id_usuario_registro: currentUser.id,
        observaciones: observations.trim() || null,
      });

      if (error) {
        toast.error(error);
        setLoading(false);
        return;
      }

      toast.success('Incidencia registrada correctamente', {
        description: `ID: ${incident?.id}`,
      });

      // Reset form
      setSelectedStudent(null);
      setSelectedFault('');
      setObservations('');
      setShowReincidenceAlert(false);
      setSearchInput('');
      setSearchResults([]);
    } catch (error: any) {
      toast.error('Error al registrar incidencia');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const groupedFaults = faults.reduce((acc, fault) => {
    if (!acc[fault.category]) {
      acc[fault.category] = [];
    }
    acc[fault.category].push(fault);
    return acc;
  }, {} as Record<string, FaultType[]>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Registrar Incidencia</h1>

      {/* Barcode Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Barcode className="w-5 h-5 mr-2" />
            Escanear Código de Barras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <Input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Escanee o ingrese el código de barras..."
              autoFocus
              className="font-mono"
              disabled={loading}
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Manual Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Búsqueda Manual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Buscar estudiante por nombre</Label>
            <div className="relative">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Escriba el nombre del estudiante..."
                disabled={loading}
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => handleSearchSelect(student.id.toString())}
                      className="px-4 py-2 hover:bg-accent cursor-pointer"
                    >
                      <p className="font-medium">{student.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.grade} {student.section} • {student.barcode}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Info */}
      {selectedStudent && (
        <>
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle>Información del Estudiante</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Nombre Completo</Label>
                    <p className="text-lg font-semibold">{selectedStudent.fullName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Grado</Label>
                      <p className="text-lg font-semibold">{selectedStudent.grade}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Sección</Label>
                      <p className="text-lg font-semibold">{selectedStudent.section}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Código</Label>
                    <p className="font-mono">{selectedStudent.barcode}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Nivel de Reincidencia</Label>
                    <ReincidenceBadge level={selectedStudent.reincidenceLevel || 0} className="text-lg px-4 py-2" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {getReincidenceLevelDescription(selectedStudent.reincidenceLevel || 0)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Faltas últimos 60 días</Label>
                    <p className="text-2xl font-bold">{selectedStudent.faultsLast60Days || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reincidence Alert */}
          {showReincidenceAlert && selectedStudent.reincidenceLevel && selectedStudent.reincidenceLevel >= 2 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>¡Alerta de Reincidencia!</AlertTitle>
              <AlertDescription>
                <p className="mb-2">Este estudiante tiene un nivel de reincidencia {selectedStudent.reincidenceLevel}.</p>
                <p className="font-semibold">Acción sugerida: {getSuggestedAction(selectedStudent.reincidenceLevel)}</p>
              </AlertDescription>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowReincidenceAlert(false)}
                className="mt-2"
              >
                <span className="flex items-center">
                  <X className="w-4 h-4 mr-2" />
                  Cerrar
                </span>
              </Button>
            </Alert>
          )}

          {/* Fault Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Falta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Seleccionar falta</Label>
                <Select value={selectedFault} onValueChange={setSelectedFault} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo de falta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedFaults).map(([category, faultList]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                          {category}
                        </div>
                        {faultList.map((fault) => (
                          <SelectItem key={fault.id} value={fault.id.toString()}>
                            {fault.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFault && (() => {
                const fault = faults.find(f => f.id.toString() === selectedFault);
                return fault && (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={fault.severity} />
                      <span className="text-sm text-muted-foreground">Categoría: {fault.category}</span>
                    </div>
                    <p className="text-sm">{fault.description || 'Sin descripción'}</p>
                    <p className="text-sm font-semibold">Puntos: {fault.points}</p>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Describa los detalles de la incidencia..."
                  rows={4}
                  maxLength={500}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {observations.length}/500 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label>Evidencia Fotográfica (Opcional)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Haga clic o arrastre hasta 3 fotos (JPG/PNG, máx. 5MB)
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Incidencia
                    </span>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedStudent(null);
                    setSelectedFault('');
                    setObservations('');
                    setShowReincidenceAlert(false);
                  }}
                  disabled={loading}
                >
                  <span className="flex items-center">
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};