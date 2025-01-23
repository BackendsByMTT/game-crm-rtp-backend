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
exports.default = openChromePages;
const puppeteer_1 = __importDefault(require("puppeteer"));
const config_1 = require("./config/config");
/**
 * Opens Chrome pages based on the provided IDs in separate tabs and uses Puppeteer's messaging system.
 * @param ids - Array of IDs to use for constructing URLs.
 */
function openChromePages(ids) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({
            headless: false,
        });
        try {
            const pages = yield Promise.all(ids.map((id) => __awaiter(this, void 0, void 0, function* () {
                const page = yield browser.newPage();
                const url = `http://localhost:${config_1.config.port}/testing/id:${id}`;
                console.log(`Opening page for ID: ${id} at ${url}`);
                yield page.goto(url, { waitUntil: "networkidle2" });
                return page;
            })));
            // Example: Send a message to each tab to perform some actions
            for (const page of pages) {
                yield page.evaluate(() => {
                    console.log("Performing actions in the opened tab");
                    // Add additional logic here to interact with the page
                });
            }
            console.log("All tabs are open and ready.");
        }
        catch (error) {
            console.error("Error:", error);
        }
        finally {
            // await browser.close();
        }
    });
}
