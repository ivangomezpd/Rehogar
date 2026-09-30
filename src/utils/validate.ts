import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Esquemas de validación (los puedes ampliar después)
export const schemas = {
  // Registro de usuario
  register: z.object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    rol: z.enum(['buscador', 'anfitrion', 'ambos']).optional(),
  }),

  // Login
  login: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es requerida'),
  }),

  // Crear/editar casa
  casa: z.object({
    titulo: z.string().min(3, 'El título es muy corto').max(100),
    ciudad: z.string().min(2, 'La ciudad es requerida'),
    precio: z.number().positive('El precio debe ser positivo'),
    habitaciones: z.number().int().positive().optional(),
    banos: z.number().int().positive().optional(),
    tipo: z.string().optional(),
    genero_ok: z.string().optional(),
    mascotas: z.boolean().optional(),
    descripcion: z.string().max(2000).optional(),
    amenities: z.array(z.string()).max(30).optional(),
    fotos: z.array(z.string().url('URL de foto inválida')).max(10).optional(),
    custodia_ok: z.string().max(50).optional(),
  }),

  // Actualizar perfil (datos generales + campos de afinidad/custodia)
  perfilAfinidad: z.object({
    nombre: z.string().min(2).max(50).optional(),
    bio: z.string().max(1000).optional(),
    ciudad: z.string().min(2).optional(),
    custodia: z.string().max(200).optional(),
    // null = borrar la seleccion ("Sin especificar"); ausente = no tocar el valor actual.
    custodia_patron: z.enum(['semana_alterna', 'fin_de_semana_alterno', 'ninguna', 'otro']).nullable().optional(),
    custodia_semana_par: z.boolean().optional(),
    num_hijos: z.number().int().min(0).max(20).optional(),
    estilo_vida_tags: z.array(z.string().max(40)).max(20).optional(),
    busca_afinidad: z.enum(['solo_divorciados_con_hijos', 'divorciados', 'indiferente']).optional(),
  }),

  // Enviar mensaje
  mensaje: z.object({
    receptor_id: z.number().int().positive('ID de receptor inválido'),
    contenido: z.string().min(1, 'El mensaje no puede estar vacío').max(2000),
    casa_id: z.number().int().positive().optional(),
  }),

  // Solicitar visita
  visita: z.object({
    casa_id: z.number().int().positive('Casa inválida'),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    hora: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)'),
    notas: z.string().max(500).optional(),
  }),
};

// Middleware de validación genérico
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: result.error.issues.map((issue) => ({
          campo: issue.path.join('.'),
          mensaje: issue.message,
        })),
      });
    }
    req.body = result.data; // opcional: reemplaza el body con los datos validados
    next();
  };
};
