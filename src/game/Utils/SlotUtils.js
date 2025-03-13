"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeRecurringIndexSymbols = removeRecurringIndexSymbols;
exports.cascadeMoveTowardsNull = cascadeMoveTowardsNull;
exports.transposeMatrix = transposeMatrix;
exports.combineUniqueSymbols = combineUniqueSymbols;
function removeRecurringIndexSymbols(symbolsToEmit) {
    const seen = new Set();
    const result = [];
    symbolsToEmit.forEach((subArray) => {
        if (!Array.isArray(subArray)) {
            console.warn("Expected an array but got", subArray);
            return;
        }
        const uniqueSubArray = [];
        subArray.forEach((symbol) => {
            if (!seen.has(symbol)) {
                seen.add(symbol);
                uniqueSubArray.push(symbol);
            }
        });
        if (uniqueSubArray.length > 0) {
            result.push(uniqueSubArray);
        }
    });
    return result;
}
function cascadeMoveTowardsNull(arr) {
    if (arr.length === 0 || arr[0].length === 0)
        return arr;
    const numRows = arr.length;
    const numCols = arr[0].length;
    let result = Array.from({ length: numRows }, () => new Array(numCols).fill(null));
    for (let col = 0; col < numCols; col++) {
        let newRow = numRows - 1;
        // Place non-null elements starting from the bottom
        for (let row = numRows - 1; row >= 0; row--) {
            if (arr[row][col] !== null) {
                result[newRow][col] = arr[row][col];
                newRow--;
            }
        }
        // Fill the top positions with null if there are remaining positions
        for (let row = newRow; row >= 0; row--) {
            result[row][col] = null;
        }
    }
    return result;
}
function transposeMatrix(matrix) {
    let transposed = [];
    for (let i = 0; i < matrix[0].length; i++) {
        let newRow = [];
        for (let j = 0; j < matrix.length; j++) {
            newRow.push(matrix[j][i]);
        }
        transposed.push(newRow);
    }
    return transposed;
}
function combineUniqueSymbols(symbolsToEmit) {
    const seen = new Set();
    const result = [];
    symbolsToEmit.forEach((subArray) => {
        subArray.forEach((symbol) => {
            if (!seen.has(symbol)) {
                seen.add(symbol);
                result.push(symbol);
            }
        });
    });
    return result;
}
