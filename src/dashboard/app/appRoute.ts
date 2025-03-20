import { Router } from 'express';
import { incrementInstall, incrementDownload } from './appController';

const router = Router();

router.post('/install', incrementInstall);
router.post('/download', incrementDownload);

export default router;
