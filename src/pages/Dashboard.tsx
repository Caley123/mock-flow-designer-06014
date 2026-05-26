import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Users, 
  AlertCircle, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Award,
  Target
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  TooltipProps,
  ComposedChart,
  Line,
  Area,
  LineChart
} from 'recharts';
import { useEffect, useState, useRef } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { dashboardService, arrivalService, incidentsService } from '@/lib/services';
import { DashboardStats, Incident } from '@/types';
import { toast } from 'sonner';
import { useSpring, animated } from '@react-spring/web';
import { COLORS } from '@/lib/constants/colors';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { PageHeader } from '@/components/layout/PageHeader';
import { LayoutDashboard } from 'lucide-react';

// Colores para los niveles de incidencia
const LEVEL_COLORS = {
  level0: COLORS.success,
  level1: COLORS.accentLight,
  level2: COLORS.warning,
  level3: COLORS.secondaryLight,
  level4: COLORS.secondary,
  level5: COLORS.error,
};

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [departureAlerts, setDepartureAlerts] = useState<Array<{
    record: any;
    hoursSinceArrival: number;
    isCritical: boolean;
  }>>([]);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; incidents: number }[]>([]);
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  
  // Métricas de rendimiento
  usePerformanceMetrics('Dashboard');
  
  // Animaciones
  const fadeIn = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    config: { tension: 300, friction: 30 }
  });

  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchDashboardData = async () => {
      if (!isMountedRef.current) return;
      
      setLoading(true);
      
      try {
        const [
          statsResult,
          alertsResult,
          incidentsResult,
          trendResult,
        ] = await Promise.all([
          dashboardService.getDashboardStats(),
          arrivalService.getDepartureAlerts(),
          incidentsService.getAll({ limit: 6, offset: 0 }),
          dashboardService.getMonthlyTrend(),
        ]);

        if (!isMountedRef.current) return;

        if (statsResult.error) {
          console.error('Error fetching dashboard data:', statsResult.error);
          toast.error('Error al cargar estadísticas del dashboard');
          setStats(null);
        } else if (statsResult.stats) {
          setStats(statsResult.stats);
        }

        if (!alertsResult.error && alertsResult.alerts) {
          setDepartureAlerts(alertsResult.alerts);
        }

        if (!incidentsResult.error && incidentsResult.incidents) {
          setRecentIncidents(incidentsResult.incidents);
        }

        if (!trendResult.error && trendResult.monthlyTrend) {
          setMonthlyTrend(trendResult.monthlyTrend);
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        console.error('Error fetching dashboard data:', error);
        toast.error('Error al cargar datos del dashboard');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
    
    // Actualizar alertas cada 5 minutos
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        arrivalService.getDepartureAlerts().then(({ alerts }) => {
          if (isMountedRef.current && alerts) {
            setDepartureAlerts(alerts);
          }
        });
      }
    }, 5 * 60 * 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <PageLoader message="Cargando estadísticas del dashboard..." />;
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error al cargar los datos del dashboard. Por favor, intente recargar la página.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Preparar datos para gráficos
  const levelData = [
    { name: 'Nivel 0', value: stats.levelDistribution.level0, color: LEVEL_COLORS.level0 },
    { name: 'Nivel 1', value: stats.levelDistribution.level1, color: LEVEL_COLORS.level1 },
    { name: 'Nivel 2', value: stats.levelDistribution.level2, color: LEVEL_COLORS.level2 },
    { name: 'Nivel 3', value: stats.levelDistribution.level3, color: LEVEL_COLORS.level3 },
    { name: 'Nivel 4', value: stats.levelDistribution.level4, color: LEVEL_COLORS.level4 },
  ].filter(item => item.value > 0);

  // Calcular porcentajes de cambio
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Calcular tasa de resolución
  const resolutionRate = stats.totalIncidents > 0 
    ? Math.min(100, Math.round(((stats.totalIncidents - stats.incidentsToday) / stats.totalIncidents) * 100))
    : 100;

  // Calcular porcentaje de crecimiento
  const growthPercentage = monthlyTrend.length >= 2
    ? calculatePercentageChange(
        monthlyTrend[monthlyTrend.length - 1].incidents,
        monthlyTrend[monthlyTrend.length - 2].incidents
      )
    : 0;

  return (
    <div className="app-page w-full">
      <animated.div style={fadeIn}>
        <PageHeader
          icon={LayoutDashboard}
          eyebrow="Resumen general"
          title="Panel de Inicio"
          description="Indicadores del día, tendencias y accesos rápidos a las tareas más frecuentes"
          accent="primary"
        >
          <div className="flex gap-2">
            <Button variant="outline-warning" onClick={() => navigate('/register')}>
              <FileText className="w-4 h-4 mr-2" />
              Nueva Incidencia
            </Button>
            <Button variant="success" onClick={() => navigate('/arrival-control')}>
              <Clock className="w-4 h-4 mr-2" />
              Control de Asistencia
            </Button>
          </div>
        </PageHeader>
      </animated.div>

      {/* Stats Cards - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Incidencias */}
        <Card className="app-card border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Incidencias</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalIncidents}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-success mr-1" />
                  <span className="text-sm text-success font-medium">
                    +{stats.incidentsThisMonth} este mes
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incidencias Hoy */}
        <Card className="app-card border-l-4 border-l-warning">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Incidencias Hoy</p>
                <p className="text-3xl font-bold text-foreground">{stats.incidentsToday}</p>
                <div className="flex items-center mt-2">
                  {stats.incidentsToday > 0 ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-warning mr-1" />
                      <span className="text-sm text-warning font-medium">
                        {stats.incidentsToday} {stats.incidentsToday === 1 ? 'incidencia' : 'incidencias'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-success mr-1" />
                      <span className="text-sm text-success font-medium">Sin incidencias</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estudiantes Afectados */}
        <Card className="app-card border-l-4 border-l-accent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Estudiantes Afectados</p>
                <p className="text-3xl font-bold text-foreground">{stats.studentsWithIncidents}</p>
                <div className="flex items-center mt-2">
                  <Activity className="w-4 h-4 text-accent mr-1" />
                  <span className="text-sm text-accent font-medium">
                    {stats.incidentsThisWeek} esta semana
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasa de Resolución */}
        <Card className="app-card border-l-4 border-l-success">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tasa de Resolución</p>
                <p className="text-3xl font-bold text-foreground">{resolutionRate}%</p>
                <div className="flex items-center mt-2">
                  {resolutionRate > 80 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-success mr-1" />
                      <span className="text-sm text-success font-medium">Excelente</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-warning mr-1" />
                      <span className="text-sm text-warning font-medium">Mejorable</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Revenue Chart - Incidencias Mensuales */}
        <Card className="lg:col-span-2 app-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Tendencia de Incidencias</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Últimos 5 meses</CardDescription>
              </div>
              <Badge variant="success">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                {growthPercentage > 0 ? '+' : ''}{growthPercentage.toFixed(1)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
                  }}
                />
                <Bar dataKey="incidents" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                <Line type="monotone" dataKey="incidents" stroke="hsl(var(--accent))" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Growth Card */}
        <Card className="app-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground">Crecimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="hsl(var(--border))"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(stats.incidentsThisMonth / Math.max(stats.totalIncidents, 1)) * 352} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.incidentsThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Este mes</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">Incidencias del mes actual</p>
            </div>
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Promedio Nivel</span>
                <span className="text-sm font-semibold text-foreground">
                  {stats.averageReincidenceLevel.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Esta Semana</span>
                <span className="text-sm font-semibold text-foreground">{stats.incidentsThisWeek}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Chart */}
        <Card className="app-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground">Distribución por Nivel</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Niveles de reincidencia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={levelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--accent))"
                  dataKey="value"
                >
                  {levelData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => value}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Faults */}
        <Card className="app-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground">Faltas Más Frecuentes</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Top 5 faltas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topFaults.slice(0, 5).map((fault, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-accent">#{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground/85 flex-1 truncate">
                      {fault.faultType}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-foreground ml-2">{fault.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card className="app-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Incidencias Recientes</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Últimas 6 incidencias</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/incidents')}>
                Ver todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {recentIncidents.length > 0 ? (
                recentIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/incidents`)}
                  >
                    <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {incident.student?.fullName || 'Estudiante desconocido'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {incident.faultType?.name || 'Falta desconocida'}
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        {format(new Date(incident.registeredAt), "dd MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        incident.reincidenceLevel >= 3
                          ? 'destructive'
                          : incident.reincidenceLevel >= 2
                            ? 'warning'
                            : 'success'
                      }
                    >
                      Nivel {incident.reincidenceLevel}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay incidencias recientes</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Salidas */}
      {departureAlerts.length > 0 && (
        <Card className="app-card border-l-4 border-l-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Alertas: Estudiantes sin Salida Registrada
              <Badge variant="destructive" className="ml-2">{departureAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {departureAlerts.slice(0, 6).map((alert) => (
                <div
                  key={alert.record.id}
                  className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20 hover:border-warning/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${alert.isCritical ? 'bg-destructive' : 'bg-warning'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {alert.record.student?.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alert.hoursSinceArrival.toFixed(1)}h sin salida
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline-warning"
                    onClick={() => navigate('/arrival-control')}
                    className="ml-2 flex-shrink-0"
                  >
                    Ver
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
