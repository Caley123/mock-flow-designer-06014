import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AttendanceSettingsCard } from '@/components/system-config/AttendanceSettingsCard';
import { ReincidenceSettingsCard } from '@/components/system-config/ReincidenceSettingsCard';

export const SystemConfig = () => {
  return (
    <div className="app-page app-page-shell">
      <PageHeader
        icon={Settings}
        eyebrow="Administración"
        title="Configuración del Sistema"
        description="Horarios de asistencia y reglas de reincidencia que aplican a todo el colegio"
        accent="secondary"
      />

      <AttendanceSettingsCard />
      <ReincidenceSettingsCard />
    </div>
  );
};
