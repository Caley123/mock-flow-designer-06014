import React from 'react';
import { LoadingScreen } from './loading-screen';

interface PageLoaderProps {
  message?: string;
}

/**
 * Componente de carga para páginas completas
 * Muestra una pantalla de carga con animación de cartas estilo tarot
 */
export const PageLoader: React.FC<PageLoaderProps> = ({ message }) => {
  return <LoadingScreen message={message} fullScreen={true} />;
};

