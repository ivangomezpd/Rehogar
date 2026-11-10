import winston from 'winston';
import fs from 'fs';

const { combine, timestamp, printf, colorize } = winston.format;

// Asegurar que la carpeta logs existe. `recursive: true` evita la carrera
// entre workers de Jest en paralelo: dos suites comprueban existsSync()
// a la vez, ambas ven que falta y ambas lanzan mkdirSync(); una gana y la
// otra revienta con EEXIST, tirando el suite entero.
const logDir = 'logs';
fs.mkdirSync(logDir, { recursive: true });

const myFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp(), myFormat),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), myFormat),
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});