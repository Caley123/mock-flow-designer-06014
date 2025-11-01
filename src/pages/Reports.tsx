import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, TrendingUp, Users, AlertTriangle, Calendar, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { dashboardService } from '@/lib/services';
import { DashboardStats } from '@/types';
import { toast } from 'sonner';

export const Reports = () => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const { stats: dashboardStats, error } = await dashboardService.getDashboardStats();
    if (error) {
      toast.error('Error al cargar estadísticas');
    } else if (dashboardStats) {
      setStats(dashboardStats);
    }
    setLoading(false);
  };

  const monthlyTrend = [
    { month: 'Jun', incidents: 142 },
    { month: 'Jul', incidents: 168 },
    { month: 'Ago', incidents: 195 },
    { month: 'Sep', incidents: 223 },
    { month: 'Oct', incidents: stats?.incidentsThisMonth || 0 },
  ];

  const weeklyData = [
    { day: 'Lun', count: 8 },
    { day: 'Mar', count: 12 },
    { day: 'Mié', count: 15 },
    { day: 'Jue', count: 10 },
    { day: 'Vie', count: 13 },
  ];

  // Filter data by grade
  const filteredIncidentsByGrade = selectedGrade === 'all' 
    ? (stats?.incidentsByGrade || [])
    : (stats?.incidentsByGrade || []).filter(item => item.grade === selectedGrade);

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Error al cargar las estadísticas</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Reportes y Estadísticas</h1>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por grado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los grados</SelectItem>
              <SelectItem value="1ro">1ro</SelectItem>
              <SelectItem value="2do">2do</SelectItem>
              <SelectItem value="3ro">3ro</SelectItem>
              <SelectItem value="4to">4to</SelectItem>
              <SelectItem value="5to">5to</SelectItem>
              <SelectItem value="6to">6to</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Seleccionar Período
            </span>
          </Button>
          <Button onClick={loadStats}>
            <span className="flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Exportar Reporte
            </span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalIncidents}</div>
                <p className="text-sm text-muted-foreground">Total Incidencias</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.studentsWithIncidents}</div>
                <p className="text-sm text-muted-foreground">Estudiantes Involucrados</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.averageReincidenceLevel.toFixed(1)}</div>
                <p className="text-sm text-muted-foreground">Nivel Promedio</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.levelDistribution.level3 + stats.levelDistribution.level4}</div>
                <p className="text-sm text-muted-foreground">Casos Críticos</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tendencia Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="incidents" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Incidencias"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidencias por Día (Esta Semana)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Incidencias" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Incidencias por Grado
              {selectedGrade !== 'all' && ` - ${selectedGrade}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredIncidentsByGrade.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredIncidentsByGrade} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="grade" type="category" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Incidencias" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No hay datos para el grado seleccionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Nivel de Reincidencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { level: 'Nivel 0 - Sin reincidencias', count: stats.levelDistribution.level0, color: 'success' },
                { level: 'Nivel 1 - Primera reincidencia', count: stats.levelDistribution.level1, color: 'warning' },
                { level: 'Nivel 2 - Reincidencia moderada', count: stats.levelDistribution.level2, color: 'warning' },
                { level: 'Nivel 3 - Reincidencia alta', count: stats.levelDistribution.level3, color: 'danger' },
                { level: 'Nivel 4 - Reincidencia crítica', count: stats.levelDistribution.level4, color: 'danger' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.level}</span>
                    <span className="text-sm font-bold">{item.count}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${stats.totalIncidents > 0 ? (item.count / stats.totalIncidents) * 100 : 0}%`,
                        backgroundColor: item.color === 'success' ? 'hsl(var(--success))' :
                                       item.color === 'warning' ? 'hsl(var(--warning))' :
                                       'hsl(var(--danger))'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Faults Table */}
      <Card>
        <CardHeader>
          <CardTitle>Faltas Más Frecuentes</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topFaults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="space-y-4">
              {stats.topFaults.map((fault, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{fault.faultType}</span>
                      <span className="font-bold">{fault.count} incidencias</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-3">
                      <div
                        className="bg-primary h-3 rounded-full transition-all"
                        style={{ 
                          width: `${stats.topFaults.length > 0 && stats.topFaults[0].count > 0 
                            ? (fault.count / stats.topFaults[0].count) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stats.totalIncidents > 0 ? ((fault.count / stats.totalIncidents) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};