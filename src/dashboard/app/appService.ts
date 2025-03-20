import App from './appModel';

export const incrementInstallCount = async () => {
  return App.findOneAndUpdate({}, { $inc: { installCount: 1 } }, { new: true, upsert: true });
};

export const incrementDownloadCount = async () => {
  return App.findOneAndUpdate({}, { $inc: { downloadCount: 1 } }, { new: true, upsert: true });
};
