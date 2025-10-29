import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { mockStudents } from '@/lib/mockData';
import { Search, Plus, Eye, Edit, UserPlus, Download } from 'lucide-react';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { Badge } from '@/components/ui/badge';

export const StudentsList = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = mockStudents.filter(student =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.barcode.includes(searchTerm) ||
    student.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Estudiantes</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Estudiante
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, código de barras o grado..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{mockStudents.length}</div>
            <p className="text-sm text-muted-foreground">Total Estudiantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">
              {mockStudents.filter(s => s.reincidenceLevel === 0).length}
            </div>
            <p className="text-sm text-muted-foreground">Sin Incidencias</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">
              {mockStudents.filter(s => s.reincidenceLevel >= 1 && s.reincidenceLevel <= 2).length}
            </div>
            <p className="text-sm text-muted-foreground">Nivel Moderado</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-danger">
              {mockStudents.filter(s => s.reincidenceLevel >= 3).length}
            </div>
            <p className="text-sm text-muted-foreground">Nivel Alto</p>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Estudiantes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Grado</TableHead>
                <TableHead>Sección</TableHead>
                <TableHead>Faltas (60d)</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono text-sm">{student.barcode}</TableCell>
                  <TableCell>
                    <p className="font-medium">{student.fullName}</p>
                  </TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell>{student.section}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.faultsLast60Days}</Badge>
                  </TableCell>
                  <TableCell>
                    <ReincidenceBadge level={student.reincidenceLevel} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={student.active ? 'default' : 'secondary'}>
                      {student.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
