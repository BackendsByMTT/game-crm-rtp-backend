import ComboCounter from "./ComboCounter";
import { specialIcons } from "./gameUtils";
import SlotGame from "./slotGame";

export default class PayLines {
    wild: any;
    useWildInFirstPosition: boolean;
    useWild: any;
    symbolsDict: any;
    line: any;
    pay: any;
    freeSpins: any;
    currentGame: SlotGame;


    constructor(line, pay, freeSpins, wild, currentGame) {
        this.line = line;
        this.pay = pay;
        this.freeSpins = freeSpins;
        this.useWildInFirstPosition = true;
        this.wild = wild;
        this.currentGame = currentGame;
    }

    getWildLines() {
        let res: PayLines[] = [];
        if (!this.currentGame.settings.useWild) return res;

        let wPoss = this.getPositionsForWild();
        const maxWildsCount = this.useWildInFirstPosition
            ? wPoss.length - 1
            : wPoss.length;


        let minWildsCount = 1;
        let maxCounterValues: any[] = [];

        wPoss.forEach((p) => {
            maxCounterValues.push(1);
        });

        let cC = new ComboCounter(maxCounterValues);
        //HERE
        while (cC.nextCombo()) {
            let combo = cC.combo;
            let comboSum = cC.sum(); // count of wilds in combo

            if (comboSum >= minWildsCount && comboSum <= maxWildsCount) {
                let p = new PayLines(
                    Array.from(this.line),
                    this.pay,
                    this.freeSpins,
                    this.wild,
                    this.currentGame
                );
                for (let i = 0; i < wPoss.length; i++) {
                    let pos = wPoss[i];
                    if (combo[i] == 1) {
                        p.line[pos] = this.wild;
                    }
                }
                if (!this.isEqual(p) && !this.containEqualLine(res, p)) res.push(p);
            }
        }



        return res;
    }

    getPositionsForWild() {
        let wPoss: any[] = [];
        let counter = 0;
        let symbolsDict: any[] = [];

        this.currentGame.settings.currentGamedata.Symbols.forEach((name) => {
            const data = {
                name: name.Name,
                Id: name.Id,
                useWildSub: name.useWildSub,
            };
            symbolsDict.push(data);

        });

        for (let i = 0; i < this.line.length; i++) {
            let sName = this.line[i];
            if (sName !== specialIcons.any && sName !== this.wild) {
                if (!this.useWildInFirstPosition && counter == 0) {
                    // don't use first
                    counter++;
                } else {


                    if (symbolsDict[sName]?.useWildSub) wPoss.push(i);
                    counter++;
                }
            }
        }
        return wPoss;
    }

    isEqual(pLine) {
        if (pLine === null) return false;
        if (pLine.line === null) return false;
        if (this.line.length != pLine.line.length) return false;
        for (let i = 0; i < this.line.length; i++) {
            if (this.line[i] !== pLine.line[i]) return false;
        }
        return true;
    }

    containEqualLine(pList, pLine) {
        if (pList == null) return false;
        if (pLine == null) return false;
        if (pLine.line == null) return false;
        for (let i = 0; i < pList.length; i++) {
            if (pList[i].isEqual(pLine)) return true;
        }
        return false;
    }
}