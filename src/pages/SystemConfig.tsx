import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Settings, Plus, Edit, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { configService } from '@/lib/services';
import type { SystemConfig as SystemConfigType } from '@/types';
import { Badge } from '@/components/ui/badge';

export const SystemConfig = () => {
  const [configs, setConfigs] = useState<SystemConfigType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfigType | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<SystemConfigType | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    const { configs: configsList, error } = await configService.getAll();
    if (error) {
      toast.error('Error al cargar configuraciones');
    } else {
      setConfigs(configsList);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setEditingConfig(null);
    setFormData({ key: '', value: '', description: '' });
    setShowDialog(true);
  };

  const handleEdit = (config: SystemConfigType) => {
    setEditingConfig(config);
    setFormData({
      key: config.key,
      value: config.value,
      description: config.description || '',
    });
    setShowDialog(true);
  };

  const handleDelete = (config: SystemConfigType) => {
    setDeletingConfig(config);
    setShowDeleteDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.key.trim() || !formData.value.trim()) {
      toast.error('La clave y el valor son obligatorios');
      return;
    }

    setSaving(true);

    try {
      if (editingConfig) {
        const { error } = await configService.update(editingConfig.id, {
          value: formData.value,
          description: formData.description,
        });

        if (error) {
          toast.error(error);
        } else {
          toast.success('Configuración actualizada');
          setShowDialog(false);
          loadConfigs();
        }
      } else {
        const { error } = await configService.create({
          key: formData.key,
          value: formData.value,
          description: formData.description,
        });

        if (error) {
          toast.error(error);
        } else {
          toast.success('Configuración creada');
          setShowDialog(false);
          loadConfigs();
        }
      }
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingConfig) return;

    try {
      const { error } = await configService.delete(deletingConfig.id);

      if (error) {
        toast.error(error);
      } else {
        toast.success('Configuración eliminada');
        setShowDeleteDialog(false);
        setDeletingConfig(null);
        loadConfigs();
      }
    } catch (error) {
      toast.error('Error al eliminar configuración');
    }
  };

  const formatTimeValue = (key: string, value: string) => {
    if (key === 'hora_limite_llegada') {
      return (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-mono font-semibold">{value}</span>
        </div>
      );
    }
    return <span className="font-mono">{value}</span>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Configuración del Sistema
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestione los parámetros globales del sistema
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Configuración
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parámetros del Sistema</CardTitle>
          <CardDescription>
            Configure los valores que controlan el comportamiento del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando configuraciones...
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay configuraciones registradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clave</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Última Actualización</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <Badge variant="outline">{config.key}</Badge>
                    </TableCell>
                    <TableCell>{formatTimeValue(config.key, config.value)}</TableCell>
                    <TableCell className="max-w-xs">
                      {config.description || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {new Date(config.updatedAt).toLocaleString('es-ES')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para agregar/editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? 'Modifique el valor o descripción de la configuración'
                : 'Agregue un nuevo parámetro de configuración'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key">Clave *</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="hora_limite_llegada"
                disabled={!!editingConfig}
              />
              {editingConfig && (
                <p className="text-xs text-muted-foreground">
                  La clave no puede ser modificada
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Valor *</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="08:00:00"
              />
              {formData.key === 'hora_limite_llegada' && (
                <p className="text-xs text-muted-foreground">
                  Formato: HH:MM:SS (ejemplo: 08:00:00)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del parámetro"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la configuración{' '}
              <strong>{deletingConfig?.key}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingConfig(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
