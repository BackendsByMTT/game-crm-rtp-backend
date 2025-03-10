"use strict";
/**
 * Import file system module to write JSON files
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hypergeometric = hypergeometric;
exports.calculateRTP = calculateRTP;
exports.generatePaytables = generatePaytables;
exports.examplePayoutMultiplier = examplePayoutMultiplier;
exports.calculateScalingFactor = calculateScalingFactor;
/**
 * Function to calculate factorial
 * @param {number} n - The number to calculate the factorial of
 * @returns {number} - The factorial of the number
 */
function factorial(n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}
/**
 * Function to calculate combinations (n choose k)
 * @param {number} n - The total number of items
 * @param {number} k - The number of items to choose
 * @returns {number} - The number of combinations
 */
function combinations(n, k) {
    if (k < 0 || k > n)
        return 0;
    return factorial(n) / (factorial(k) * factorial(n - k));
}
/**
 * Function to calculate hypergeometric probability
 * @param {number} N - The population size
 * @param {number} K - The number of success states in the population
 * @param {number} n - The number of draws
 * @param {number} k - The number of observed successes
 * @returns {number} - The hypergeometric probability
 */
function hypergeometric(N, K, n, k) {
    const combinationsSuccess = combinations(K, k);
    const combinationsFailure = combinations(N - K, n - k);
    const totalCombinations = combinations(N, n);
    return (combinationsSuccess * combinationsFailure) / totalCombinations;
}
/**
 * Function to calculate RTP (Return to Player) for a specific pick size
 * @param {number} N - The population size
 * @param {number} K - The number of success states in the population
 * @param {number} n - The number of draws
 * @param {number[]} payouts - The array of payouts for each number of matches
 * @returns {number} - The RTP as a percentage
 */
function calculateRTP(N, K, n, payouts) {
    let totalExpectedReturn = 0;
    for (let k = 0; k <= K; k++) {
        const probability = hypergeometric(N, K, n, k);
        totalExpectedReturn += probability * payouts[k];
    }
    return totalExpectedReturn * 100; // RTP as a percentage
}
/**
 * Function to generate paytables and calculate RTPs for each pick size
 * @param {number} N - The population size
 * @param {number} n - The number of draws
 * @param {number} maxPicks - The maximum number of picks
 * @param {number} desiredRTP - The desired RTP
 * @param {(k: number, picks: number, desiredRTP: number) => number} payoutMultiplier - The function to calculate the payout multiplier
 * @returns {{ paytables: { [key: number]: { match: number; payout: number; probability: number }[] }, rtps: { [key: number]: number }, overallRTP: number }} - The generated paytables, RTPs, and overall RTP
 */
function generatePaytables(N, n, maxPicks, desiredRTP, payoutMultiplier) {
    const paytables = {};
    const rtps = {};
    for (let picks = 1; picks <= maxPicks; picks++) {
        const paytable = [];
        let totalExpectedReturn = 0;
        for (let match = 0; match <= picks; match++) {
            const probability = hypergeometric(N, picks, n, match);
            const payout = payoutMultiplier(match, picks, desiredRTP); // Use multiplier-based payouts
            totalExpectedReturn += probability * payout;
            paytable.push({ match, payout, probability });
        }
        paytables[picks] = paytable;
        rtps[picks] = totalExpectedReturn * 100; // RTP as a percentage
    }
    // Calculate overall RTP
    const overallRTP = Object.values(rtps).reduce((sum, rtp) => sum + rtp, 0) / maxPicks;
    return { paytables, rtps, overallRTP };
}
/**
 * Example multiplier function for realistic keno payouts
 * Adjusted payout multiplier logic to ensure uniform RTP (76% to 77%)
 * @param {number} match - The number of matches
 * @param {number} picks - The number of picks
 * @param {number} desiredRTP - The desired RTP
 * @returns {number} - The payout multiplier
 */
function examplePayoutMultiplier(match, picks, desiredRTP) {
    const baseMultiplier = match; // Linear increase based on number of matches
    const scalingFactor = calculateScalingFactor(desiredRTP); // Adjust scaling factor to maintain reasonable payout ranges
    // Adjust multiplier to keep payouts in a balanced range
    const adjustedMultiplier = match === 0 ? 0 : baseMultiplier * scalingFactor / (picks / 2);
    // Ensure multiplier isn't too small, providing reasonable payouts
    return Math.max(adjustedMultiplier, 0);
}
/**
 * Function to estimate RTP for a given scaling factor
 * @param {number} rtp - The desired RTP
 * @returns {number} - The calculated scaling factor
 */
function calculateScalingFactor(rtp) {
    const referenceScalingFactor = 1.8; // The scaling factor for which we know the RTP (90%)
    const referenceRTP = 90; // Known RTP for scaling factor 1.8
    // Apply the inverse of the proportional relationship to find scaling factor
    const scalingFactor = (rtp * referenceScalingFactor) / referenceRTP;
    // Return the scaling factor
    return scalingFactor;
}
