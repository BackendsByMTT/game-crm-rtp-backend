"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = exports.rolesHierarchy = void 0;
exports.hasPermission = hasPermission;
exports.isAdmin = isAdmin;
exports.isSubordinate = isSubordinate;
const rolesHierarchy = {
    admin: ["supermaster", "master", "distributor", "subdistributor", "store"],
    supermaster: ["master", "distributor", "subdistributor", "store"],
    master: ["distributor"],
    distributor: ["subdistributor"],
    subdistributor: ["store"],
    store: ["player"],
};
exports.rolesHierarchy = rolesHierarchy;
const permissions = {
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
exports.permissions = permissions;
function hasPermission(user, resource, action) {
    if (user.role === "admin")
        return true;
    const userPermissions = permissions[user.role];
    if (!userPermissions || !userPermissions[resource])
        return false;
    return userPermissions[resource].includes(action);
}
function isSubordinate(user, targetUser) {
    if (user.role === "admin")
        return true;
    const allowedRoles = rolesHierarchy[user.role];
    if (!allowedRoles)
        return false;
    const isRoleAllowed = allowedRoles.includes(targetUser.role);
    const isDirectSubordinate = user.subordinates.some((id) => id.equals(targetUser._id));
    return isRoleAllowed && isDirectSubordinate;
}
function isAdmin(user) {
    return user.role === "admin";
}
