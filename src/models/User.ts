import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  age?: number;
  city?: string;
  interests?: string[];
  lifestyle?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    },
    age: {
      type: Number,
      min: [18, 'Debes ser mayor de 18 años'],
      max: [120, 'Edad inválida'],
    },
    city: {
      type: String,
      trim: true,
    },
    interests: [{
      type: String,
      enum: ['deporte', 'lectura', 'arte', 'música', 'viajes', 'gastronomía', 'tecnología', 'yoga'],
    }],
    lifestyle: {
      type: String,
      enum: ['tranquilo', 'social', 'trabajo', 'mixto'],
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas rápidas
UserSchema.index({ email: 1 });
UserSchema.index({ city: 1 });
UserSchema.index({ interests: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);