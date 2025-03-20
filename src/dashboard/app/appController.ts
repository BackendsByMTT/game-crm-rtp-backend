import { Request, Response } from 'express';
import { incrementInstallCount, incrementDownloadCount } from './appService';

export const incrementInstall = async (req: Request, res: Response) => {
  try {
    const app = await incrementInstallCount();
    res.status(200).json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const incrementDownload = async (req: Request, res: Response) => {
  try {
    const app = await incrementDownloadCount();
    res.status(200).json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
