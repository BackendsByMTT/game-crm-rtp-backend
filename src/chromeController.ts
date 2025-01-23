import puppeteer from "puppeteer";
import { config } from "./config/config";

/**
 * Opens Chrome pages based on the provided IDs in separate tabs and uses Puppeteer's messaging system.
 * @param ids - Array of IDs to use for constructing URLs.
 */
export default async function openChromePages(ids: string[]): Promise<void> {
    const browser = await puppeteer.launch({
        headless: false,
    });

    try {
        const pages = await Promise.all(
            ids.map(async (id) => {
                const page = await browser.newPage();
                const url = `http://localhost:${config.port}/testing/id:${id}`;
                console.log(`Opening page for ID: ${id} at ${url}`);
                await page.goto(url, { waitUntil: "networkidle2" });
                return page;
            })
        );

        // Example: Send a message to each tab to perform some actions
        for (const page of pages) {
            await page.evaluate(() => {
                console.log("Performing actions in the opened tab");
                // Add additional logic here to interact with the page
            });
        }

        console.log("All tabs are open and ready.");
    } catch (error) {
        console.error("Error:", error);
    } finally {
       
        // await browser.close();
    }
}
