import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileText, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username && password) {
      toast.success('Inicio de sesión exitoso');
      navigate('/');
    } else {
      toast.error('Por favor ingrese usuario y contraseña');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              <FileText className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Sistema de Control de Incidencias</CardTitle>
            <CardDescription className="mt-2">
              Ingrese sus credenciales para acceder al sistema
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full">
              <LogIn className="w-4 h-4 mr-2" />
              Iniciar Sesión
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="link" className="text-sm">
              ¿Olvidó su contraseña?
            </Button>
          </div>
          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Usuarios de prueba: supervisor1, tutor1, director, admin
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
