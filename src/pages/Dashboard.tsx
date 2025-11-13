import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Users, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle
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
  Area
} from 'recharts';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboardService } from '@/lib/services';
import { DashboardStats } from '@/types';
import { toast } from 'sonner';
import { useSpring, animated } from '@react-spring/web';
import { COLORS } from '@/lib/constants/colors';

// Colores para los niveles de incidencia
const LEVEL_COLORS = {
  level0: COLORS.success,
  level1: COLORS.accentLight,
  level2: COLORS.warning,
  level3: COLORS.secondaryLight,
  level4: COLORS.secondary,
  level5: COLORS.error,
};

// Estilo personalizado para el tooltip
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Cantidad:</span> {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Animaciones
  const fadeIn = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    config: { tension: 300, friction: 30 }
  });
  
  const cardAnimation = useSpring({
    from: { opacity: 0, transform: 'scale(0.95)' },
    to: { opacity: 1, transform: 'scale(1)' },
    config: { tension: 300, friction: 20 }
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      const { stats: dashboardStats, error } = await dashboardService.getDashboardStats();

      if (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Error al cargar estadísticas del dashboard');
        setStats(null);
      } else if (dashboardStats) {
        setStats(dashboardStats);
      }
      
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48 bg-gradient-to-r from-[#1E3A8A] to-[#800020]" />
          <Skeleton className="h-4 w-64 bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl border border-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl border border-gray-200" />
          <Skeleton className="h-80 rounded-xl border border-gray-200" />
        </div>
        <Skeleton className="h-64 rounded-xl border border-gray-200" />
      </div>
    );
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

  // Datos para el gráfico de barras de incidencias por grado
  const barChartData = stats.incidentsByGrade.map(grade => ({
    name: grade.grade,
    value: grade.count,
  }));
  
  // Calcular total de estudiantes con incidencias
  const totalStudentsWithIncidents = stats.incidentsByGrade.reduce(
    (sum, grade) => sum + grade.count, 0
  );
  
  // Calcular tasa de resolución (usando un valor simulado para el ejemplo)
  const resolutionRate = Math.min(100, Math.round((1 - (stats.incidentsThisMonth / (stats.incidentsThisMonth + 50))) * 100));
  
  // Obtener incidencias de hoy (usando un valor simulado para el ejemplo)
  const todaysIncidents = Math.floor(stats.incidentsThisMonth * 0.1);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <animated.div style={fadeIn}>
        <div className="bg-gradient-to-r from-cream via-sand to-beige p-6 rounded-2xl border-2 border-accent/30 shadow-xl">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary-dark to-accent bg-clip-text text-transparent drop-shadow-sm">
            Panel de Control
          </h1>
          <p className="text-foreground/70 mt-2 font-medium text-lg">Resumen de incidencias y estadísticas del Colegio San Ramón • 60 años</p>
        </div>
      </animated.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <animated.div style={cardAnimation}>
          <Card className="h-full border-l-4 border-success shadow-xl hover:shadow-2xl transition-all hover:scale-105 bg-gradient-to-br from-white to-cream">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-success/10 via-success/5 to-transparent">
              <CardTitle className="text-sm font-bold text-foreground">
                Total Incidencias
              </CardTitle>
              <div className="p-2 rounded-full bg-success/10">
                <AlertCircle className="h-6 w-6 text-success" />
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="text-3xl font-bold text-success">{stats.totalIncidents}</div>
              <p className="text-xs text-muted mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 text-success mr-1" />
                +20.1% del mes anterior
              </p>
            </CardContent>
          </Card>
        </animated.div>

        <animated.div style={{ ...cardAnimation, animationDelay: '0.1s' }}>
          <Card className="h-full border-l-4 border-primary shadow-xl hover:shadow-2xl transition-all hover:scale-105 bg-gradient-to-br from-white to-sand">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
              <CardTitle className="text-sm font-bold text-foreground">
                Estudiantes Activos
              </CardTitle>
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                {totalStudentsWithIncidents}
              </div>
              <p className="text-xs text-muted mt-1">
                <span className="text-primary font-medium">+{Math.floor(totalStudentsWithIncidents * 0.1)}</span> desde la semana pasada
              </p>
            </CardContent>
          </Card>
        </animated.div>

        <animated.div style={{ ...cardAnimation, animationDelay: '0.2s' }}>
          <Card className="h-full border-l-4 border-amber-500 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Incidencias Hoy
              </CardTitle>
              <div className="p-2 rounded-full bg-amber-100">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{todaysIncidents}</div>
              <p className={`text-xs mt-1 flex items-center ${
                todaysIncidents > 0 ? 'text-amber-500' : 'text-green-500'
              }`}>
                {todaysIncidents > 0 ? (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {todaysIncidents} {todaysIncidents === 1 ? 'incidencia' : 'incidencias'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Sin incidencias
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        </animated.div>

        <animated.div style={{ ...cardAnimation, animationDelay: '0.3s' }}>
          <Card className="h-full border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Tasa de Resolución
              </CardTitle>
              <div className="p-2 rounded-full bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{resolutionRate}%</div>
              <p className={`text-xs mt-1 flex items-center ${
                resolutionRate > 80 ? 'text-green-500' : 'text-amber-500'
              }`}>
                {resolutionRate > 80 ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Excelente
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Necesita mejora
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        </animated.div>
      </div>

      {/* Sección de acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-primary hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Clock className="h-5 w-5 text-primary mr-2" />
              Control de Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Registra la asistencia de los estudiantes de manera rápida y sencilla.
            </p>
            <Button className="w-full" variant="outline">
              Registrar Asistencia
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-secondary hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <FileText className="h-5 w-5 text-secondary mr-2" />
              Nueva Incidencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Registra una nueva incidencia para un estudiante.
            </p>
            <Button className="w-full bg-secondary hover:bg-secondary/90">
              Registrar Incidencia
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-accent hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <BarChart className="h-5 w-5 text-accent mr-2" />
              Ver Reportes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Genera reportes detallados de incidencias y asistencia.
            </p>
            <Button className="w-full bg-accent hover:bg-accent/90 text-white">
              Ver Reportes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-scale-in">
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="flex items-center text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                <AlertCircle className="w-4 h-4 text-primary" />
              </div>
              Distribución por Nivel de Reincidencia
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={levelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {levelData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-medium text-gray-900">{data.name}</p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Cantidad:</span> {data.value}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Faults */}
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 animate-slide-in-right">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center text-lg">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            Faltas Más Frecuentes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {stats.topFaults.slice(0, 5).map((fault, index) => (
              <div key={index} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      #{index + 1}
                    </div>
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      {fault.faultType}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-primary">{fault.count}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-primary to-primary/60 h-2.5 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${(fault.count / stats.topFaults[0].count) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
