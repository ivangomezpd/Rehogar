import { Router } from 'express';
import { getHouses, getHouseById, createHouse, updateHouse, deleteHouse } from '../controllers/houseController';

const router = Router();

router.get('/', getHouses);
router.get('/:id', getHouseById);
router.post('/', createHouse);
router.put('/:id', updateHouse);
router.delete('/:id', deleteHouse);

export default router;