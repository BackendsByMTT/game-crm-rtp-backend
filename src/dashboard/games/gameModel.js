"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Platform = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const newGameSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    tagName: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true
    },
    payout: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: true,
        ref: 'Payout'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const PlatformSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true
    },
    games: {
        type: [newGameSchema],
    }
});
// Create an index on the games.slug field
PlatformSchema.index({ 'games.slug': 1 });
PlatformSchema.index({ 'games.category': 1 });
const Platform = mongoose_1.default.model("Platform", PlatformSchema);
exports.Platform = Platform;
