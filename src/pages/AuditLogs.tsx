import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileText, Database, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { auditService } from '@/lib/services';
import type { AuditLog } from '@/types';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const pageSize = 20;

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [currentPage, selectedTable, selectedOperation]);

  const loadLogs = async () => {
    setLoading(true);
    const filters: any = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    };

    if (selectedTable) filters.table = selectedTable;
    if (selectedOperation) filters.operation = selectedOperation;

    const { logs: fetchedLogs, total: fetchedTotal, error } = await auditService.getAuditLogs(filters);

    if (error) {
      toast.error('Error al cargar logs de auditoría');
    } else {
      setLogs(fetchedLogs);
      setTotal(fetchedTotal);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const { stats: fetchedStats } = await auditService.getAuditStats(7);
    setStats(fetchedStats);
  };

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400';
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400';
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const uniqueTables = Array.from(new Set(stats?.byTable ? Object.keys(stats.byTable) : []));

  return (
    <div className="min-h-screen p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Auditoría del Sistema</h1>
          <p className="text-muted-foreground">Registro completo de operaciones en la base de datos</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-all duration-300 animate-fade-up">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Operaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOperations}</div>
              <p className="text-xs text-muted-foreground mt-1">Últimos 7 días</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-all duration-300 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inserciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.inserts}</div>
              <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">INSERT</Badge>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-all duration-300 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Actualizaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.updates}</div>
              <Badge className="mt-2 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400">UPDATE</Badge>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-all duration-300 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Eliminaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.deletes}</div>
              <Badge className="mt-2 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400">DELETE</Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tabla</Label>
              <Select value={selectedTable} onValueChange={(value) => {
                setSelectedTable(value === 'all' ? '' : value);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las tablas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tablas</SelectItem>
                  {uniqueTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Operación</Label>
              <Select value={selectedOperation} onValueChange={(value) => {
                setSelectedOperation(value === 'all' ? '' : value);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las operaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="INSERT">INSERT</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setSelectedTable('');
                  setSelectedOperation('');
                  setCurrentPage(1);
                }}
                variant="outline"
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Registros de Auditoría
          </CardTitle>
          <CardDescription>
            {total} registros encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Tabla</TableHead>
                  <TableHead>Operación</TableHead>
                  <TableHead>Fecha y Hora</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No se encontraron registros
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono">{log.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.table}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getOperationColor(log.operation)}>
                          {log.operation}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.timestamp).toLocaleString('es-ES')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedLog && (
        <Card className="fixed inset-4 z-50 max-w-4xl mx-auto my-auto h-fit animate-scale-in shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Detalles del Log #{selectedLog.id}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                ✕
              </Button>
            </div>
            <CardDescription>
              {selectedLog.table} - {selectedLog.operation}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Fecha y Hora</Label>
              <p className="text-sm font-mono mt-1">
                {new Date(selectedLog.timestamp).toLocaleString('es-ES')}
              </p>
            </div>
            
            {selectedLog.previousData && (
              <div>
                <Label className="text-sm font-semibold">Datos Anteriores</Label>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4 mt-1">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(selectedLog.previousData, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}
            
            {selectedLog.newData && (
              <div>
                <Label className="text-sm font-semibold">Datos Nuevos</Label>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4 mt-1">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(selectedLog.newData, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-black/50 z-40" 
          onClick={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};
