import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rehogar';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info(`✅ MongoDB conectado exitosamente: ${MONGODB_URI}`);
    console.log('✅ Base de datos conectada');
  } catch (error) {
    logger.error('❌ Error conectando a MongoDB:', error);
    console.error('Error conectando a base de datos:', error);
    // process.exit(1); // No salir para permitir auditoría estática
  }
};

// Manejar desconexión
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB desconectado');
});

mongoose.connection.on('error', (err) => {
  logger.error('❌ Error en MongoDB:', err);
});