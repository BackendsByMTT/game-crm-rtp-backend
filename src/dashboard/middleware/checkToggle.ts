
import { Request, Response, NextFunction } from 'express';
import Toggle from '../Toggle/ToggleModel';
import { AuthRequest, formatDate } from '../../utils/utils';
import { User } from '../users/userModel';
import createHttpError from 'http-errors';

export const checkLoginToggle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyUsers = await User.find({ role: 'company' });
    //check if company users exist ,then pass through
    if (companyUsers?.find(user => user.username === req.body.username)) {
      next()
    } else {
      const { underMaintenance, availableAt } = await isAvaiable();
      if (underMaintenance === true) {
        res.status(200).json({ message: `underMaintenance till ${formatDate(availableAt.toISOString())}`, isUnderMaintenance: underMaintenance });
        return
      } else {
        next()
      }
    }
  } catch (error) {
    next(error);
  }
};

export const checkGamesToggle = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const companyUsers = await User.find({ role: 'company' });
    //check if company users exist ,then pass through
    if (companyUsers?.find(user => user.username === req.body.username)) {
      next()
    } else {
      const { underMaintenance, availableAt } = await isAvaiable();
      if (underMaintenance === true) {
        res.status(201).json({ message: `underMaintenance till ${formatDate(availableAt.toISOString())}`, isUnderMaintenance: underMaintenance, availableAt: availableAt });
        return
      } else {
        next()
      }
    }
  } catch (error) {
    next(error);
  }
}

async function isAvaiable() {
  const toggle = await Toggle.findOne();
  if (!toggle) throw createHttpError(404, "Toggle not found");
  if (toggle.availableAt === null) {
    return { underMaintenance: false, availableAt: null }
  }
  const now = new Date();
  const time = new Date(toggle.availableAt);
  if (time > now) {
    return { underMaintenance: true, availableAt: toggle.availableAt }
  } else {
    await Toggle.findOneAndUpdate(
      {},
      { availableAt: null },
      { new: true, upsert: true }
    )
    return { underMaintenance: false, availableAt: null }
  }
}
