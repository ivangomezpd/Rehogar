import mongoose, { Schema, Document } from 'mongoose';

export interface IHouse extends Document {
  title: string;
  description: string;
  address: string;
  city: string;
  price: number;
  rooms: number;
  amenities: string[];
  images: string[];
  hostId: mongoose.Types.ObjectId;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HouseSchema = new Schema<IHouse>(
  {
    title: {
      type: String,
      required: [true, 'El título es requerido'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'La descripción es requerida'],
      maxlength: [2000, 'La descripción no puede exceder 2000 caracteres'],
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'El precio no puede ser negativo'],
    },
    rooms: {
      type: Number,
      required: true,
      min: [1, 'Debe haber al menos 1 habitación'],
    },
    amenities: [{
      type: String,
      enum: ['wifi', 'cocina', 'lavandería', 'estacionamiento', 'piscina', 'gimnasio', 'mascotas', 'aire acondicionado'],
    }],
    images: [{
      type: String,
      url: String,
    }],
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas
HouseSchema.index({ city: 1, price: 1 });
HouseSchema.index({ available: 1 });
HouseSchema.index({ 'amenities': 1 });

export const House = mongoose.model<IHouse>('House', HouseSchema);