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
        const { stats: dashboardStats, error } = await dashboardService.getDashboardStats();

        if (!isMountedRef.current) return;

        if (error) {
          console.error('Error fetching dashboard data:', error);
          toast.error('Error al cargar estadísticas del dashboard');
          setStats(null);
        } else if (dashboardStats) {
          setStats(dashboardStats);
        }
        
        // Cargar alertas de salidas no registradas
        const { alerts, error: alertsError } = await arrivalService.getDepartureAlerts();
        if (!isMountedRef.current) return;
        if (!alertsError && alerts) {
          setDepartureAlerts(alerts);
        }

        // Cargar incidencias recientes
        const { incidents, error: incidentsError } = await incidentsService.getAll({
          limit: 6,
          offset: 0,
        });
        if (!isMountedRef.current) return;
        if (!incidentsError && incidents) {
          setRecentIncidents(incidents);
        }

        // Cargar tendencia mensual
        const { monthlyTrend: trend, error: trendError } = await dashboardService.getMonthlyTrend();
        if (!isMountedRef.current) return;
        if (!trendError && trend) {
          setMonthlyTrend(trend);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-4 md:p-6 space-y-6 w-full">
      {/* Header */}
      <animated.div style={fadeIn}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Bienvenido al sistema de gestión escolar</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/register')}>
              <FileText className="w-4 h-4 mr-2" />
              Nueva Incidencia
            </Button>
            <Button onClick={() => navigate('/arrival-control')}>
              <Clock className="w-4 h-4 mr-2" />
              Control de Asistencia
            </Button>
          </div>
        </div>
      </animated.div>

      {/* Stats Cards - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Incidencias */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Incidencias</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalIncidents}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 font-medium">
                    +{stats.incidentsThisMonth} este mes
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incidencias Hoy */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Incidencias Hoy</p>
                <p className="text-3xl font-bold text-gray-900">{stats.incidentsToday}</p>
                <div className="flex items-center mt-2">
                  {stats.incidentsToday > 0 ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-500 mr-1" />
                      <span className="text-sm text-amber-600 font-medium">
                        {stats.incidentsToday} {stats.incidentsToday === 1 ? 'incidencia' : 'incidencias'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600 font-medium">Sin incidencias</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estudiantes Afectados */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Estudiantes Afectados</p>
                <p className="text-3xl font-bold text-gray-900">{stats.studentsWithIncidents}</p>
                <div className="flex items-center mt-2">
                  <Activity className="w-4 h-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600 font-medium">
                    {stats.incidentsThisWeek} esta semana
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasa de Resolución */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Tasa de Resolución</p>
                <p className="text-3xl font-bold text-gray-900">{resolutionRate}%</p>
                <div className="flex items-center mt-2">
                  {resolutionRate > 80 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600 font-medium">Excelente</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-amber-500 mr-1" />
                      <span className="text-sm text-amber-600 font-medium">Mejorable</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Revenue Chart - Incidencias Mensuales */}
        <Card className="lg:col-span-2 bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Tendencia de Incidencias</CardTitle>
                <CardDescription className="text-sm text-gray-600">Últimos 5 meses</CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                {growthPercentage > 0 ? '+' : ''}{growthPercentage.toFixed(1)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="incidents" fill="#6366f1" radius={[8, 8, 0, 0]} />
                <Line type="monotone" dataKey="incidents" stroke="#8b5cf6" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Growth Card */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">Crecimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#6366f1"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(stats.incidentsThisMonth / Math.max(stats.totalIncidents, 1)) * 352} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.incidentsThisMonth}</p>
                    <p className="text-xs text-gray-600">Este mes</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">Incidencias del mes actual</p>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Promedio Nivel</span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats.averageReincidenceLevel.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Esta Semana</span>
                <span className="text-sm font-semibold text-gray-900">{stats.incidentsThisWeek}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Chart */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">Distribución por Nivel</CardTitle>
            <CardDescription className="text-sm text-gray-600">Niveles de reincidencia</CardDescription>
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
                  fill="#8884d8"
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
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">Faltas Más Frecuentes</CardTitle>
            <CardDescription className="text-sm text-gray-600">Top 5 faltas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topFaults.slice(0, 5).map((fault, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-purple-600">#{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                      {fault.faultType}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 ml-2">{fault.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Incidencias Recientes</CardTitle>
                <CardDescription className="text-sm text-gray-600">Últimas 6 incidencias</CardDescription>
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
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/incidents`)}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {incident.student?.fullName || 'Estudiante desconocido'}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {incident.faultType?.name || 'Falta desconocida'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(incident.registeredAt), "dd MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${
                        incident.reincidenceLevel >= 3 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : incident.reincidenceLevel >= 2
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      Nivel {incident.reincidenceLevel}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No hay incidencias recientes</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Salidas */}
      {departureAlerts.length > 0 && (
        <Card className="bg-white border-0 shadow-sm border-l-4 border-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
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
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${alert.isCritical ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {alert.record.student?.fullName}
                      </p>
                      <p className="text-xs text-gray-600">
                        {alert.hoursSinceArrival.toFixed(1)}h sin salida
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
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
