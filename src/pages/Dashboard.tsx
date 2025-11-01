import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Users, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  CalendarDays
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
} from 'recharts';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboardService } from '@/lib/services';
import { DashboardStats } from '@/types';
import { toast } from 'sonner';

const COLORS = {
  level0: 'hsl(var(--success))',
  level1: 'hsl(var(--warning))',
  level2: 'hsl(var(--warning))',
  level3: 'hsl(var(--danger))',
  level4: 'hsl(var(--danger))',
  level5: 'hsl(var(--danger))',
};

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!stats) {
    return <div className="container mx-auto p-6">Error al cargar los datos del dashboard.</div>;
  }
  
  const levelData = Object.entries(stats.levelDistribution).map(([level, value]) => ({
    name: `Nivel ${level.replace('nivel_', '')}`,
    value: value as number,
    color: COLORS[`level${level.replace('nivel_', '')}` as keyof typeof COLORS] || '#8884d8',
  }));

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Resumen de incidencias y estadísticas</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidencias Hoy</CardTitle>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              {stats.incidentsToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">registradas hoy</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              {stats.incidentsThisWeek}
            </div>
            <p className="text-xs text-muted-foreground mt-1">últimos 7 días</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mes</CardTitle>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              {stats.incidentsThisMonth}
            </div>
            <p className="text-xs text-muted-foreground mt-1">mes actual</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              {stats.studentsWithIncidents}
            </div>
            <p className="text-xs text-muted-foreground mt-1">con incidencias</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-scale-in">
        {/* Incidents by Grade */}
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="flex items-center text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                <BarChart className="w-4 h-4 text-primary" />
              </div>
              Incidencias por Grado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.incidentsByGrade}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="grade" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reincidence Levels */}
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
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
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
            {stats.topFaults.map((fault: any, index: number) => (
              <div key={index} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      #{index + 1}
                    </div>
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      {fault.fault_type}
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
