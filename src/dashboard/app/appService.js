"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCounts = exports.incrementDownloadCount = exports.incrementInstallCount = void 0;
const appModel_1 = __importDefault(require("./appModel"));
const incrementInstallCount = () => __awaiter(void 0, void 0, void 0, function* () {
    return appModel_1.default.findOneAndUpdate({}, { $inc: { installCount: 1 } }, { new: true, upsert: true });
});
exports.incrementInstallCount = incrementInstallCount;
const incrementDownloadCount = () => __awaiter(void 0, void 0, void 0, function* () {
    return appModel_1.default.findOneAndUpdate({}, { $inc: { downloadCount: 1 } }, { new: true, upsert: true });
});
exports.incrementDownloadCount = incrementDownloadCount;
// export const getDownloadCount = async () => {
//   return App.findOne({}, { downloadCount: 1, _id: 0 });
// }
//
// export const getInstallCount = async () => {
//   return App.findOne({}, { installCount: 1, _id: 0 });
// }
const getAllCounts = () => __awaiter(void 0, void 0, void 0, function* () {
    return appModel_1.default.findOne({}, { installCount: 1, downloadCount: 1, _id: 0 });
});
exports.getAllCounts = getAllCounts;
