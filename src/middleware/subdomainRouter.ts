import { Request, Response, NextFunction } from 'express';
import { getClientBySubdomain } from '../services/b2bClientService';

/**
 * Extended Express Request with client context
 */
export interface ClientRequest extends Request {
  clientContext?: {
    clientId: string;
    subdomain: string;
    companyName: string;
    accountType: string;
    userQuota: number;
    buildingQuota: number | null;
  };
}

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
export const subdomainRouter = async (
  req: ClientRequest,
  res: Response,
  next: NextFunction
) => {
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
    if (subdomain === 'admin' || subdomain === 'www') {
      // These are for company-level pages, not client portals
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
    const client = await getClientBySubdomain(subdomain);

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
  } catch (error) {
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

/**
 * Middleware to ensure a valid client context exists
 * Use this on routes that require a client
 */
export const requireClientContext = (
  req: ClientRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.clientContext) {
    return res.status(400).json({
      error: 'No client context',
      message: 'This route requires a valid client subdomain'
    });
  }

  next();
};

/**
 * Extract client ID from request context or query
 * Useful for type-safe queries
 */
export const getClientIdFromRequest = (req: ClientRequest): string => {
  if (!req.clientContext) {
    throw new Error('No client context in request');
  }
  return req.clientContext.clientId;
};

/**
 * Development helper: Set client context from header
 * Usage: Add header "X-Client-Id: {clientId}" to requests
 * Useful for testing APIs without subdomains
 */
export const devClientContext = async (
  req: ClientRequest,
  res: Response,
  next: NextFunction
) => {
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
        client = await getClientBySubdomain(subdomainHeader);
      } else if (clientIdHeader) {
        // Import here to avoid circular dependency
        const { getClientById } = await import('../services/b2bClientService');
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
    } catch (error) {
      console.warn('Dev client context error:', error);
    }
  }

  next();
};

/**
 * Log client context info
 * Use for debugging and monitoring
 */
export const logClientContext = (
  req: ClientRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.clientContext) {
    console.log(`[Client] ${req.clientContext.companyName} (${req.clientContext.subdomain})`);
  }

  next();
};
