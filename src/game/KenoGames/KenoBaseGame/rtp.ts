import * as fs from 'fs'; // Import file system module to write JSON files

// Function to calculate factorial
function factorial(n: number): number {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

// Function to calculate combinations (n choose k)
function combinations(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    return factorial(n) / (factorial(k) * factorial(n - k));
}

// Function to calculate hypergeometric probability
export function hypergeometric(N: number, K: number, n: number, k: number): number {
    const combinationsSuccess = combinations(K, k);
    const combinationsFailure = combinations(N - K, n - k);
    const totalCombinations = combinations(N, n);

    return (combinationsSuccess * combinationsFailure) / totalCombinations;
}

// Function to calculate RTP (Return to Player) for a specific pick size
export function calculateRTP(N: number, K: number, n: number, payouts: number[]): number {
    let totalExpectedReturn = 0;

    for (let k = 0; k <= K; k++) {
        const probability = hypergeometric(N, K, n, k);
        totalExpectedReturn += probability * payouts[k];
    }

    return totalExpectedReturn * 100; // RTP as a percentage
}

// Function to generate paytables and calculate RTPs for each pick size
export function generatePaytables(
    N: number,
    n: number,
    maxPicks: number,
    desiredRTP: number,
    payoutMultiplier: (k: number, picks: number, desiredRTP: number) => number
) {
    
    const paytables: { [key: number]: { match: number; payout: number; probability: number }[] } = {};
    const rtps: { [key: number]: number } = {};

    for (let picks = 1; picks <= maxPicks; picks++) {
        const paytable: { match: number; payout: number; probability: number }[] = [];
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

// Example multiplier function for realistic keno payouts
// Adjusted payout multiplier logic to ensure uniform RTP (76% to 77%)
export function examplePayoutMultiplier(match: number, picks: number, desiredRTP:number): number {    
    const baseMultiplier = match;  // Linear increase based on number of matches
    const scalingFactor = calculateScalingFactor(desiredRTP); // Adjust scaling factor to maintain reasonable payout ranges

    // Adjust multiplier to keep payouts in a balanced range
    const adjustedMultiplier = match === 0 ? 0 : baseMultiplier * scalingFactor / (picks / 2);
    // Ensure multiplier isn't too small, providing reasonable payouts
    return Math.max(adjustedMultiplier, 0);
}


// Function to estimate RTP for a given scaling factor
export function calculateScalingFactor(rtp: number): number {
    const referenceScalingFactor = 1.8; // The scaling factor for which we know the RTP (90%)
    const referenceRTP = 90; // Known RTP for scaling factor 1.8

    // Apply the inverse of the proportional relationship to find scaling factor
    const scalingFactor = (rtp * referenceScalingFactor) / referenceRTP;

    // Return the scaling factor
    return scalingFactor;
}




export function generatePaytableJSON(
    N: number,
    n: number,
    maxPicks: number,
    desiredRTP: number,
    payoutMultiplier: (k: number, picks: number, desiredRTP: number) => number,
    outputPath: string
) {
    const { paytables } = generatePaytables(N, n, maxPicks, desiredRTP, payoutMultiplier);

    const payoutArray: number[][] = [];

    for (let picks = 1; picks <= maxPicks; picks++) {
        const payoutsForPicks = paytables[picks].map(entry => entry.payout).slice(1);
        payoutArray.push(payoutsForPicks); 
        
    }

    const jsonData = {
        desiredRTP,
        payoutArray
    };

    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');

    console.log(`Paytable JSON file successfully generated at: ${outputPath}`);
}

const outputPath = './paytable.json'; // Path to save the JSON file
// // 
