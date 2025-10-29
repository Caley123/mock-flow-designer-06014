import { ReincidenceLevel } from '@/types';

export const getReincidenceLevelColor = (level: ReincidenceLevel): string => {
  switch (level) {
    case 0:
      return 'success';
    case 1:
    case 2:
      return 'warning';
    case 3:
    case 4:
      return 'danger';
    default:
      return 'success';
  }
};

export const getReincidenceLevelLabel = (level: ReincidenceLevel): string => {
  return `Nivel ${level}`;
};

export const getReincidenceLevelDescription = (level: ReincidenceLevel): string => {
  switch (level) {
    case 0:
      return 'Sin reincidencias';
    case 1:
      return 'Primera reincidencia';
    case 2:
      return 'Reincidencia moderada';
    case 3:
      return 'Reincidencia alta - Requiere atención';
    case 4:
      return 'Reincidencia crítica - Acción inmediata';
    default:
      return '';
  }
};

export const getSuggestedAction = (level: ReincidenceLevel): string => {
  switch (level) {
    case 0:
      return 'Registro estándar';
    case 1:
      return 'Amonestación verbal';
    case 2:
      return 'Citación a tutor';
    case 3:
      return 'Reunión con padres - Compromiso escrito';
    case 4:
      return 'Medida disciplinaria severa - Director';
    default:
      return '';
  }
};
