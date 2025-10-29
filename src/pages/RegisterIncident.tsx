import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockStudents, mockFaultTypes } from '@/lib/mockData';
import { Student, FaultType } from '@/types';
import { Barcode, Search, AlertTriangle, Upload, Save, X } from 'lucide-react';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getReincidenceLevelDescription, getSuggestedAction } from '@/lib/utils/reincidenceUtils';
import { toast } from 'sonner';

export const RegisterIncident = () => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFault, setSelectedFault] = useState<string>('');
  const [observations, setObservations] = useState('');
  const [showReincidenceAlert, setShowReincidenceAlert] = useState(false);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const student = mockStudents.find(s => s.barcode === barcodeInput);
    if (student) {
      setSelectedStudent(student);
      if (student.reincidenceLevel >= 2) {
        setShowReincidenceAlert(true);
      }
      toast.success(`Estudiante encontrado: ${student.fullName}`);
    } else {
      toast.error('Código de barras no encontrado');
    }
    setBarcodeInput('');
  };

  const handleSearchSelect = (studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
      if (student.reincidenceLevel >= 2) {
        setShowReincidenceAlert(true);
      }
    }
  };

  const handleSave = () => {
    if (!selectedStudent || !selectedFault) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }
    
    toast.success('Incidencia registrada correctamente', {
      description: `ID: INC-2024-${Math.floor(Math.random() * 1000)}`,
    });
    
    // Reset form
    setSelectedStudent(null);
    setSelectedFault('');
    setObservations('');
    setShowReincidenceAlert(false);
  };

  const groupedFaults = mockFaultTypes.reduce((acc, fault) => {
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
            />
            <Button type="submit">
              <Search className="w-4 h-4 mr-2" />
              Buscar
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
            <Label>Buscar estudiante por nombre o código</Label>
            <Select onValueChange={handleSearchSelect} value={searchInput}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un estudiante..." />
              </SelectTrigger>
              <SelectContent>
                {mockStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.fullName} - {student.grade} {student.section} ({student.barcode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    <ReincidenceBadge level={selectedStudent.reincidenceLevel} className="text-lg px-4 py-2" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {getReincidenceLevelDescription(selectedStudent.reincidenceLevel)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Faltas últimos 60 días</Label>
                    <p className="text-2xl font-bold">{selectedStudent.faultsLast60Days}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reincidence Alert */}
          {showReincidenceAlert && selectedStudent.reincidenceLevel >= 2 && (
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
                <X className="w-4 h-4 mr-2" />
                Cerrar
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
                <Select value={selectedFault} onValueChange={setSelectedFault}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo de falta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedFaults).map(([category, faults]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                          {category}
                        </div>
                        {faults.map((fault) => (
                          <SelectItem key={fault.id} value={fault.id}>
                            {fault.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFault && (() => {
                const fault = mockFaultTypes.find(f => f.id === selectedFault);
                return fault && (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={fault.severity} />
                      <span className="text-sm font-mono text-muted-foreground">{fault.code}</span>
                    </div>
                    <p className="text-sm">{fault.description}</p>
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
                <Button onClick={handleSave} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Incidencia
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedStudent(null);
                    setSelectedFault('');
                    setObservations('');
                    setShowReincidenceAlert(false);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
