import mongoose, { mongo } from "mongoose";
import { IPlayer, IUser } from "../dashboard/users/userType";

const rolesHierarchy: Record<string, string[]> = {
    admin: ["supermaster", "master", "distributor", "subdistributor", "store"],
    supermaster: ["master", "distributor", "subdistributor", "store"],
    master: ["distributor"],
    distributor: ["subdistributor"],
    subdistributor: ["store"],
    store: ["player"],
};

const permissions: Record<string, Record<string, string[]>> = {
    admin: {
        games: ["r", "w", "x"],
        supermasters: ["r", "w", "x"],
        masters: ["r", "w", "x"],
        distributors: ["r", "w", "x"],
        subdistributors: ["r", "w", "x"],
        stores: ["r", "w", "x"],
        players: ["r", "w", "x"],
    },
    supermaster: {
        masters: ["r", "w", "x"],
        distributors: ["r", "w", "x"],
        subdistributors: ["r", "w", "x"],
        stores: ["r", "w", "x"],
        players: ["r", "w", "x"],
    },
    master: {
        distributors: ["r", "w", "x"],
        subdistributors: ["r", "w", "x"],
        stores: ["r", "w", "x"],
        players: ["r", "w", "x"],
    },
    distributor: {
        subdistributors: ["r", "w", "x"],
        stores: ["r", "w", "x"],
        players: ["r", "w", "x"],
    },
    subdistributor: {
        stores: ["r", "w", "x"],
        players: ["r", "w", "x"],
    },
    store: {
        players: ["r", "w", "x"],
    },
    player: {
        games: ["r"],
    },
};

function hasPermission(user: IUser | IPlayer, resource: string, action: string): boolean {
    if (user.role === "admin") return true;

    const userPermissions = permissions[user.role];
    if (!userPermissions || !userPermissions[resource]) return false;

    return userPermissions[resource].includes(action);
}

function isSubordinate(user: IUser, targetUser: IUser | IPlayer): boolean {
    if (user.role === "admin") return true;

    const allowedRoles = rolesHierarchy[user.role];
    if (!allowedRoles) return false;

    const isRoleAllowed = allowedRoles.includes(targetUser.role);
    const isDirectSubordinate = user.subordinates.some((id) => id.equals(targetUser._id as mongoose.Types.ObjectId));
    return isRoleAllowed && isDirectSubordinate;
}

function isAdmin(user: IUser | IPlayer): boolean {
    return user.role === "admin";
}

export { rolesHierarchy, permissions, hasPermission, isAdmin, isSubordinate };