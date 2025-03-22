import { Request, Response } from 'express';
import { incrementInstallCount, incrementDownloadCount, getAllCounts } from './appService';

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

// export const getDownload = async (req: Request, res: Response) => {
//   try {
//     const count = await getDownloadCount()
//     res.status(200).json(count);
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// }
//
// export const getInstall = async (req: Request, res: Response) => {
//   try {
//     const count = await getInstallCount();
//     res.status(200).json(count);
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// }
export const getAppMetrics = async (req: Request, res: Response) => {
  try {
    const counts = await getAllCounts();
    console.log("count", counts);

    res.status(200).json(counts);
  } catch (e) {
    console.log("error", e);

    res.status(500).json({ error: e.message })
  }
}

export const setBackground = async (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body.isBack !== 'boolean') {
      return res.status(400).json({ error: "background boolean is required" });
    }

    const background: boolean = req.body.isBack;
    console.log("background", background);

    //TODO: emit socket msg - "reactNat","isBack:true | false"

    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
