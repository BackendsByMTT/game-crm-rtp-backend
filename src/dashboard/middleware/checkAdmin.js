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
exports.checkAdmin = checkAdmin;
const http_errors_1 = __importDefault(require("http-errors"));
function checkAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const _req = req;
        const { role } = _req.user;
        try {
            if (role !== "admin") {
                const error = (0, http_errors_1.default)(403, 'Access Denied: You do not have permission to access this resource.');
                return next(error);
            }
            next();
        }
        catch (err) {
            const error = (0, http_errors_1.default)(500, 'Internal Server Error');
            next(error);
        }
    });
}
