
import App from './appModel';

export const incrementInstallCount = async () => {
  return App.findOneAndUpdate({}, { $inc: { installCount: 1 } }, { new: true, upsert: true });
};

export const incrementDownloadCount = async () => {
  return App.findOneAndUpdate({}, { $inc: { downloadCount: 1 } }, { new: true, upsert: true });
};

// export const getDownloadCount = async () => {
//   return App.findOne({}, { downloadCount: 1, _id: 0 });
// }
//
// export const getInstallCount = async () => {
//   return App.findOne({}, { installCount: 1, _id: 0 });
// }

export const getAllCounts = async () => {
  return App.findOne({}, { installCount: 1, downloadCount: 1, _id: 0 });
}
