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
import { Download, TrendingUp, Users, AlertTriangle, Calendar, Loader2, Filter } from 'lucide-react';

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
  const [severityFilter, setSeverityFilter] = useState<'all' | 'moderate' | 'critical'>('all');
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

  // Filter level distribution by severity focus
  const levelItems = stats
    ? [
        { level: 'Nivel 0 - Sin reincidencias', key: 'level0' as const, count: stats.levelDistribution.level0, severity: 'low' },
        { level: 'Nivel 1 - Primera reincidencia', key: 'level1' as const, count: stats.levelDistribution.level1, severity: 'moderate' },
        { level: 'Nivel 2 - Reincidencia moderada', key: 'level2' as const, count: stats.levelDistribution.level2, severity: 'moderate' },
        { level: 'Nivel 3 - Reincidencia alta', key: 'level3' as const, count: stats.levelDistribution.level3, severity: 'critical' },
        { level: 'Nivel 4 - Reincidencia crítica', key: 'level4' as const, count: stats.levelDistribution.level4, severity: 'critical' },
      ]
    : [];

  const filteredLevelItems = levelItems.filter((item) => {
    if (severityFilter === 'all') return true;
    if (severityFilter === 'moderate') return item.severity === 'moderate';
    if (severityFilter === 'critical') return item.severity === 'critical';
    return true;
  });

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
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark text-transparent bg-clip-text">
            Reportes y Estadísticas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visión general de las incidencias registrados en el sistema
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-[170px] bg-white/80 border-border">
              <SelectValue placeholder="Todos los grados" />
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
          <Select value={severityFilter} onValueChange={(value: any) => setSeverityFilter(value)}>
            <SelectTrigger className="w-[190px] bg-white/80 border-border">
              <SelectValue placeholder="Enfoque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los niveles</SelectItem>
              <SelectItem value="moderate">Reincidencias moderadas</SelectItem>
              <SelectItem value="critical">Casos críticos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="bg-white/80 border-accent/40 text-foreground">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Periodo actual
            </span>
          </Button>
          <Button onClick={loadStats} className="bg-gradient-to-r from-primary via-primary-dark to-primary text-white shadow-md hover:shadow-lg">
            <span className="flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Exportar Reporte
            </span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 via-cream to-white border-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary-dark">{stats.totalIncidents}</div>
                <p className="text-sm text-muted-foreground">Total Incidencias</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 via-white to-cream border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-700">{stats.studentsWithIncidents}</div>
                <p className="text-sm text-muted-foreground">Estudiantes Involucrados</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 via-white to-cream border-amber-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-700">{stats.averageReincidenceLevel.toFixed(1)}</div>
                <p className="text-sm text-muted-foreground">Nivel Promedio</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 via-white to-cream border-rose-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-rose-700">{stats.levelDistribution.level3 + stats.levelDistribution.level4}</div>
                <p className="text-sm text-muted-foreground">Casos Críticos</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts y detalle */}
      {/* Tendencia mensual a ancho completo */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
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

      {/* Fila: Incidencias por día vs por grado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>

      {/* Fila: Distribución de niveles vs faltas más frecuentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/60 bg-white/95">
          <CardHeader>
            <CardTitle>Distribución por Nivel de Reincidencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredLevelItems.map((item, index) => (
                <div key={item.key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.level}</span>
                    <span className="text-sm font-bold">{item.count}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${stats.totalIncidents > 0 ? (item.count / stats.totalIncidents) * 100 : 0}%`,
                        backgroundColor:
                          item.severity === 'low'
                            ? 'hsl(var(--success))'
                            : item.severity === 'moderate'
                            ? 'hsl(var(--warning))'
                            : 'hsl(var(--danger))'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white/95">
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

    </div>
  );
};