import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSpring, animated } from '@react-spring/web';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, TrendingUp, Users, AlertTriangle, Calendar, Loader2, Filter, BarChart3 } from 'lucide-react';

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

  const headerAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(-20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: { tension: 200, friction: 20 }
  });

  const AnimatedDiv = animated.div;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-beige/30">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto p-6 space-y-6 relative z-10">
        <AnimatedDiv style={headerAnimation} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-burgundy to-primary-dark flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-burgundy to-primary-dark text-transparent bg-clip-text">
                  Reportes y Estadísticas
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Visión general de las incidencias registradas en el sistema
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="w-[170px] bg-white/90 backdrop-blur-sm border-accent/30 shadow-sm hover:shadow-md transition-shadow">
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
              <SelectTrigger className="w-[190px] bg-white/90 backdrop-blur-sm border-accent/30 shadow-sm hover:shadow-md transition-shadow">
                <SelectValue placeholder="Enfoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los niveles</SelectItem>
                <SelectItem value="moderate">Reincidencias moderadas</SelectItem>
                <SelectItem value="critical">Casos críticos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-white/90 backdrop-blur-sm border-gold/40 text-foreground shadow-sm hover:shadow-md transition-all hover:border-gold/60">
              <Calendar className="w-4 h-4 mr-2" />
              Periodo actual
            </Button>
            <Button onClick={loadStats} className="bg-gradient-to-r from-primary via-burgundy to-primary-dark text-white shadow-md hover:shadow-xl transition-all hover:scale-105">
              <Download className="w-4 h-4 mr-2" />
              Exportar Reporte
            </Button>
          </div>
        </AnimatedDiv>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-burgundy/10 via-cream/50 to-white border-l-4 border-l-primary shadow-lg hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-br from-primary to-burgundy text-transparent bg-clip-text">{stats.totalIncidents}</div>
                  <p className="text-sm text-warm-gray-600 font-medium mt-1">Total Incidencias</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-burgundy text-white flex items-center justify-center shadow-md">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gold/10 via-beige/50 to-white border-l-4 border-l-gold shadow-lg hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-br from-gold to-accent text-transparent bg-clip-text">{stats.studentsWithIncidents}</div>
                  <p className="text-sm text-warm-gray-600 font-medium mt-1">Estudiantes Involucrados</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-accent text-white flex items-center justify-center shadow-md">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-accent/10 via-cream/50 to-white border-l-4 border-l-accent shadow-lg hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-br from-accent to-gold text-transparent bg-clip-text">{stats.averageReincidenceLevel.toFixed(1)}</div>
                  <p className="text-sm text-warm-gray-600 font-medium mt-1">Nivel Promedio</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-gold text-white flex items-center justify-center shadow-md">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-danger/10 via-beige/50 to-white border-l-4 border-l-danger shadow-lg hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-br from-danger to-rose-700 text-transparent bg-clip-text">{stats.levelDistribution.level3 + stats.levelDistribution.level4}</div>
                  <p className="text-sm text-warm-gray-600 font-medium mt-1">Casos Críticos</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-danger to-rose-700 text-white flex items-center justify-center shadow-md">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts y detalle */}
        {/* Tendencia mensual a ancho completo */}
        <Card className="bg-white/80 backdrop-blur-sm border-accent/20 shadow-lg">
          <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-cream/30 to-beige/20">
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-primary to-burgundy rounded-full" />
              Tendencia Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--burgundy))" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--warm-gray-200))" />
                <XAxis dataKey="month" stroke="hsl(var(--warm-gray-600))" />
                <YAxis stroke="hsl(var(--warm-gray-600))" />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid hsl(var(--accent))', borderRadius: '8px' }} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="incidents" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  name="Incidencias"
                  dot={{ fill: 'hsl(var(--burgundy))', r: 5 }}
                  activeDot={{ r: 7 }}
                  fill="url(#colorIncidents)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fila: Incidencias por día vs por grado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-gold/20 shadow-lg">
            <CardHeader className="border-b border-gold/10 bg-gradient-to-r from-beige/30 to-cream/20">
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-gold to-accent rounded-full" />
                Incidencias por Día (Esta Semana)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={1}/>
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--warm-gray-200))" />
                  <XAxis dataKey="day" stroke="hsl(var(--warm-gray-600))" />
                  <YAxis stroke="hsl(var(--warm-gray-600))" />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid hsl(var(--gold))', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="url(#colorBar)" name="Incidencias" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-burgundy/20 shadow-lg">
            <CardHeader className="border-b border-burgundy/10 bg-gradient-to-r from-cream/30 to-beige/20">
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-burgundy to-primary-dark rounded-full" />
                Incidencias por Grado
                {selectedGrade !== 'all' && ` - ${selectedGrade}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {filteredIncidentsByGrade.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredIncidentsByGrade} layout="vertical">
                    <defs>
                      <linearGradient id="colorGrade" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                        <stop offset="100%" stopColor="hsl(var(--burgundy))" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--warm-gray-200))" />
                    <XAxis type="number" stroke="hsl(var(--warm-gray-600))" />
                    <YAxis dataKey="grade" type="category" stroke="hsl(var(--warm-gray-600))" />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid hsl(var(--primary))', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="url(#colorGrade)" name="Incidencias" radius={[0, 8, 8, 0]} />
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
          <Card className="bg-white/80 backdrop-blur-sm border-accent/20 shadow-lg">
            <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-beige/30 to-cream/20">
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-accent to-gold rounded-full" />
                Distribución por Nivel de Reincidencia
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-5">
                {filteredLevelItems.map((item, index) => (
                  <div key={item.key} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-warm-gray-700">{item.level}</span>
                      <span className="text-sm font-bold bg-gradient-to-r from-primary to-burgundy text-transparent bg-clip-text">{item.count}</span>
                    </div>
                    <div className="w-full bg-warm-gray-100 rounded-full h-3 shadow-inner overflow-hidden">
                      <div
                        className="h-3 rounded-full transition-all duration-500 group-hover:shadow-lg"
                        style={{
                          width: `${stats.totalIncidents > 0 ? (item.count / stats.totalIncidents) * 100 : 0}%`,
                          background:
                            item.severity === 'low'
                              ? 'linear-gradient(90deg, hsl(var(--success)), hsl(var(--success-dark)))'
                              : item.severity === 'moderate'
                              ? 'linear-gradient(90deg, hsl(var(--warning)), hsl(var(--accent)))'
                              : 'linear-gradient(90deg, hsl(var(--danger)), hsl(var(--danger-dark)))'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-primary/20 shadow-lg">
            <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-cream/30 to-beige/20">
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-primary to-primary-dark rounded-full" />
                Faltas Más Frecuentes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {stats.topFaults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay datos disponibles
                </div>
              ) : (
                <div className="space-y-5">
                  {stats.topFaults.map((fault, index) => {
                    const colors = [
                      'from-burgundy to-primary-dark',
                      'from-primary to-burgundy',
                      'from-gold to-accent',
                      'from-accent to-gold',
                      'from-primary-dark to-burgundy'
                    ];
                    return (
                      <div key={index} className="flex items-center gap-4 group">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${colors[index % colors.length]} text-white font-bold shadow-md group-hover:shadow-lg transition-all`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-warm-gray-700">{fault.faultType}</span>
                            <span className="font-bold text-sm bg-gradient-to-r from-primary to-burgundy text-transparent bg-clip-text">{fault.count} incidencias</span>
                          </div>
                          <div className="w-full bg-warm-gray-100 rounded-full h-3 shadow-inner overflow-hidden">
                            <div
                              className={`bg-gradient-to-r ${colors[index % colors.length]} h-3 rounded-full transition-all duration-500 group-hover:shadow-lg`}
                              style={{ 
                                width: `${stats.topFaults.length > 0 && stats.topFaults[0].count > 0 
                                  ? (fault.count / stats.topFaults[0].count) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-warm-gray-500 min-w-[45px] text-right">
                          {stats.totalIncidents > 0 ? ((fault.count / stats.totalIncidents) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};