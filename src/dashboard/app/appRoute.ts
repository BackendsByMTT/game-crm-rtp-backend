import { Router } from 'express';
import { incrementInstall, incrementDownload, getAppMetrics, setBackground } from './appController';
import { checkUser } from '../middleware/checkUser';
import { checkRole } from '../middleware/checkRole';

const appRoutes = Router();

appRoutes.post('/install', incrementInstall);
appRoutes.post('/download', incrementDownload);

appRoutes.get('/metrics', checkUser,
  // checkRole(["admin"]),
  getAppMetrics);

appRoutes.post('/background',  checkUser, setBackground);


export default appRoutes;
