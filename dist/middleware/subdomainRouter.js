"use strict";
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
exports.logClientContext = exports.devClientContext = exports.getClientIdFromRequest = exports.requireClientContext = exports.subdomainRouter = void 0;
const b2bClientService_1 = require("../services/b2bClientService");
/**
 * Subdomain Router Middleware
 *
 * Extracts the subdomain from the request host and resolves the B2BClient.
 * Injects clientContext into the request for use in routes and services.
 *
 * Domain format: {subdomain}.buildhub.casa
 * Examples:
 *   - residencias-palmira.buildhub.casa → subdomain: "residencias-palmira"
 *   - admin.buildhub.casa → subdomain: "admin" (reserved for SuperAdmin)
 *   - localhost:3001 → no subdomain (development)
 */
const subdomainRouter = async (req, res, next) => {
    try {
        const host = req.get('host') || '';
        const [subdomain] = host.split('.');
        // Check if it's localhost or IP address (development)
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
        if (isLocalhost) {
            // For development, allow routes without subdomain
            // TODO: Implement optional test subdomain via header or query param
            req.clientContext = undefined;
            return next();
        }
        // Check for reserved subdomains
        if (subdomain === 'admin' || subdomain === 'www' || subdomain === 'api' || subdomain === 'buildhub-api') {
            // These are for company-level pages/APIs, not client portals
            req.clientContext = undefined;
            return next();
        }
        // Validate subdomain is present and valid
        if (!subdomain || subdomain.length < 3 || subdomain.length > 63) {
            return res.status(400).json({
                error: 'Invalid subdomain',
                message: 'Subdomain must be between 3 and 63 characters'
            });
        }
        // Lookup client by subdomain
        const client = await (0, b2bClientService_1.getClientBySubdomain)(subdomain);
        if (!client) {
            return res.status(404).json({
                error: 'Client not found',
                message: `No client found for subdomain: ${subdomain}`
            });
        }
        // Inject client context into request
        req.clientContext = {
            clientId: client.id,
            subdomain: client.subdomain,
            companyName: client.companyName,
            accountType: client.accountType,
            userQuota: client.userQuota,
            buildingQuota: client.buildingQuota
        };
        next();
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('is ACTIVE')) {
            return res.status(403).json({
                error: 'Client unavailable',
                message: error.message
            });
        }
        console.error('Subdomain router error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to resolve client'
        });
    }
};
exports.subdomainRouter = subdomainRouter;
/**
 * Middleware to ensure a valid client context exists
 * Use this on routes that require a client
 */
const requireClientContext = (req, res, next) => {
    if (!req.clientContext) {
        return res.status(400).json({
            error: 'No client context',
            message: 'This route requires a valid client subdomain'
        });
    }
    next();
};
exports.requireClientContext = requireClientContext;
/**
 * Extract client ID from request context or query
 * Useful for type-safe queries
 */
const getClientIdFromRequest = (req) => {
    if (!req.clientContext) {
        throw new Error('No client context in request');
    }
    return req.clientContext.clientId;
};
exports.getClientIdFromRequest = getClientIdFromRequest;
/**
 * Development helper: Set client context from header
 * Usage: Add header "X-Client-Id: {clientId}" to requests
 * Useful for testing APIs without subdomains
 */
const devClientContext = async (req, res, next) => {
    // Only enable in development
    if (process.env.NODE_ENV !== 'development') {
        return next();
    }
    const clientIdHeader = req.get('X-Client-Id');
    const subdomainHeader = req.get('X-Subdomain');
    // Skip if already has client context from subdomainRouter
    if (req.clientContext) {
        return next();
    }
    // Try to use header-based client
    if (clientIdHeader || subdomainHeader) {
        try {
            let client;
            if (subdomainHeader) {
                client = await (0, b2bClientService_1.getClientBySubdomain)(subdomainHeader);
            }
            else if (clientIdHeader) {
                // Import here to avoid circular dependency
                const { getClientById } = await Promise.resolve().then(() => __importStar(require('../services/b2bClientService')));
                client = await getClientById(clientIdHeader);
            }
            if (client) {
                req.clientContext = {
                    clientId: client.id,
                    subdomain: client.subdomain,
                    companyName: client.companyName,
                    accountType: client.accountType,
                    userQuota: client.userQuota,
                    buildingQuota: client.buildingQuota
                };
            }
        }
        catch (error) {
            console.warn('Dev client context error:', error);
        }
    }
    next();
};
exports.devClientContext = devClientContext;
/**
 * Log client context info
 * Use for debugging and monitoring
 */
const logClientContext = (req, res, next) => {
    if (req.clientContext) {
        console.log(`[Client] ${req.clientContext.companyName} (${req.clientContext.subdomain})`);
    }
    next();
};
exports.logClientContext = logClientContext;
//# sourceMappingURL=subdomainRouter.js.map