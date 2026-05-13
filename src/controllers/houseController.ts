import { Request, Response } from 'express';
import { House } from '../models/House';
import { logger } from '../utils/logger';

export const getHouses = async (req: Request, res: Response) => {
  try {
    const { city, minPrice, maxPrice, amenities } = req.query;
    
    let query: any = {};
    
    if (city) query.city = city;
    if (minPrice) query.price = { $gte: Number(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: Number(maxPrice) };
    if (amenities) query.amenities = { $all: (amenities as string).split(',') };
    
    const houses = await House.find(query).populate('hostId', 'name email');
    res.json({ success: true, data: houses });
  } catch (error) {
    logger.error('Error getting houses:', error);
    res.status(500).json({ success: false, error: 'Error al obtener propiedades' });
  }
};

export const getHouseById = async (req: Request, res: Response) => {
  try {
    const house = await House.findById(req.params.id).populate('hostId', 'name email');
    if (!house) {
      return res.status(404).json({ success: false, error: 'Propiedad no encontrada' });
    }
    res.json({ success: true, data: house });
  } catch (error) {
    logger.error('Error getting house:', error);
    res.status(500).json({ success: false, error: 'Error al obtener propiedad' });
  }
};

export const createHouse = async (req: Request, res: Response) => {
  try {
    const house = new House(req.body);
    await house.save();
    res.status(201).json({ success: true, data: house });
  } catch (error: any) {
    logger.error('Error creating house:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateHouse = async (req: Request, res: Response) => {
  try {
    const house = await House.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!house) {
      return res.status(404).json({ success: false, error: 'Propiedad no encontrada' });
    }
    res.json({ success: true, data: house });
  } catch (error: any) {
    logger.error('Error updating house:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteHouse = async (req: Request, res: Response) => {
  try {
    const house = await House.findByIdAndDelete(req.params.id);
    if (!house) {
      return res.status(404).json({ success: false, error: 'Propiedad no encontrada' });
    }
    res.json({ success: true, message: 'Propiedad eliminada' });
  } catch (error) {
    logger.error('Error deleting house:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar propiedad' });
  }
};