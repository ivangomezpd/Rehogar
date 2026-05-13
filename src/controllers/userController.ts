import { Request, Response } from 'express';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Error getting users:', error);
    res.status(500).json({ success: false, error: 'Error al obtener usuarios' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Error getting user:', error);
    res.status(500).json({ success: false, error: 'Error al obtener usuario' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const user = new User(req.body);
    await user.save();
    
    // Método CORRECTO sin usar delete
    const userObject = user.toObject();
    // Creamos un nuevo objeto sin la propiedad password
    const { password, ...userData } = userObject;
    
    res.status(201).json({ success: true, data: userData });
  } catch (error: any) {
    logger.error('Error creating user:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'El email ya está registrado' });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: user });
  } catch (error: any) {
    logger.error('Error updating user:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
  }
};