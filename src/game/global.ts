import { Player } from '../dashboard/users/userModel';
import { GDataType, UserData } from './Utils/globalTypes';


export const GData: GDataType = {
    playerSocket: undefined,
}

export const PlayerData: UserData = {
    Balance: 0,
    haveWon: 0,
    currentWining: 0
}


export async function getPlayerCredits(playerName: string) {
    try {
        const currentUser = await Player.findOne({ username: playerName }).exec();
        if (!currentUser) {
            return `No user found with playerName ${playerName}`;
        }
        return currentUser.credits;
    } catch (error) {
        console.error(`Error fetching credits for player ${playerName}:`, error);
        return `An error occurred while fetching credits for player ${playerName}.`;
    }
}

