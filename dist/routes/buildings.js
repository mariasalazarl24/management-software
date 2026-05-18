"use strict";
/**
 * Building Routes
 * Handles building management and dashboard endpoints
 */
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
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const buildingAuth_1 = require("../middleware/buildingAuth");
const buildingService = __importStar(require("../services/buildingService"));
const router = (0, express_1.Router)();
/**
 * GET /buildings
 * Get all buildings where user is a member
 * Requires: Authentication
 */
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const offset = parseInt(req.query.offset) || 0;
        const buildings = await buildingService.getUserBuildings(req.user.userId, limit, offset);
        res.status(200).json({
            success: true,
            message: 'Buildings retrieved successfully',
            data: buildings,
            pagination: {
                limit,
                offset,
                count: buildings.length,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to retrieve buildings',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /buildings/:buildingId
 * Get single building details
 * Requires: Authentication + Building membership
 */
router.get('/:buildingId', auth_1.authMiddleware, buildingAuth_1.buildingAuthMiddleware, async (req, res) => {
    try {
        if (!req.user || !req.params.buildingId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const building = await buildingService.getBuildingDetails(req.params.buildingId, req.user.userId);
        res.status(200).json({
            success: true,
            message: 'Building details retrieved',
            data: building,
        });
    }
    catch (error) {
        const statusCode = error instanceof Error && error.message.includes('Access denied') ? 403 : 400;
        res.status(statusCode).json({
            success: false,
            message: 'Failed to retrieve building details',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /buildings/:buildingId/members
 * Get building members
 * Requires: Authentication + Building membership
 */
router.get('/:buildingId/members', auth_1.authMiddleware, buildingAuth_1.buildingAuthMiddleware, async (req, res) => {
    try {
        if (!req.user || !req.params.buildingId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const members = await buildingService.getBuildingMembers(req.params.buildingId, req.user.userId);
        res.status(200).json({
            success: true,
            message: 'Building members retrieved',
            data: members,
        });
    }
    catch (error) {
        const statusCode = error instanceof Error && error.message.includes('Access denied') ? 403 : 400;
        res.status(statusCode).json({
            success: false,
            message: 'Failed to retrieve building members',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/dashboard', auth_1.authMiddleware, auth_1.requireAdmin, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const metrics = await buildingService.getDashboardMetrics(req.user.userId);
        res.status(200).json({
            success: true,
            message: 'Dashboard metrics retrieved',
            data: metrics,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to retrieve dashboard metrics',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=buildings.js.map