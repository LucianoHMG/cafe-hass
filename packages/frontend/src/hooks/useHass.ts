import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  subscribeServices,
} from 'home-assistant-js-websocket';
import type { Connection, HassEntities, HassServices } from 'home-assistant-js-websocket';

/**
 * Home Assistant entity state
 */
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

/**
 * Home Assistant service definition
 */
export interface HassService {
  name: string;
  description: string;
  fields: Record<
    string,
    {
      name: string;
      description: string;
      required?: boolean;
      example?: unknown;
      selector?: Record<string, unknown>;
    }
  >;
  target?: {
    entity?: Array<{ domain: string }>;
    device?: unknown;
    area?: unknown;
  };
}

/**
 * Home Assistant API interface
 */
export interface HassAPI {
  states: Record<string, HassEntity>;
  services: Record<string, Record<string, HassService>>;
  callService: (domain: string, service: string, data?: Record<string, unknown>) => Promise<void>;
  connection?: Connection | null;
  callApi?: (method: string, path: string, data?: any) => Promise<any>;
}

/**
 * Configuration for connecting to Home Assistant
 */
export interface HassConfig {
  url: string;
  token: string;
}

const STORAGE_KEY = 'hflow_hass_config';

/**
 * Load config from localStorage
 */
function loadConfig(): HassConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { url: '', token: '' };
}

/**
 * Save config to localStorage
 */
function saveConfig(config: HassConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

export interface HassConfig {
  url: string;
  token: string;
}

/**
 * Hook to access Home Assistant API
 * Supports three modes:
 * 1. Embedded in HA (uses window.hass)
 * 2. Standalone with token (uses REST API)  
 * 3. Standalone without token (empty data)
 */
export function useHass() {
  const [config, setConfigState] = useState<HassConfig>(loadConfig);
  const [remoteEntities, setRemoteEntities] = useState<HassEntity[]>([]);
  const [remoteServices, setRemoteServices] = useState<Record<string, Record<string, HassService>>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<Connection | null>(null);

  // Check if running inside HA's iframe or panel
  const isInHomeAssistant = useMemo(() => {
    if (typeof window === 'undefined') return false;

    // Check for window.hass
    const hassWindow = window as unknown as {
      hass?: unknown;
      __HA_ADDON__?: boolean;
      hassConnection?: unknown;
      customCards?: unknown;
    };
    if (hassWindow.hass) {
      console.log('C.A.F.E.: HA detected via window.hass');
      return true;
    }

    // Check if we're in an iframe with HA context
    try {
      if (window.parent && window.parent !== window) {
        const parentHass = (window.parent as unknown as { hass?: unknown }).hass;
        if (parentHass) {
          console.log('C.A.F.E.: HA detected via parent iframe window.hass');
          return true;
        }
      }
    } catch {
      // Cross-origin iframe access blocked, but we might still be in HA
    }

    // Check URL patterns that indicate we're running in HA
    const pathname = window.location.pathname;
    const hostname = window.location.hostname;

    // If served from /cafe_static/ path, we're likely in HA (but not on localhost dev)
    if (pathname.includes('/cafe_static/') && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
      console.log('C.A.F.E.: HA detected via /cafe_static/ path');
      return true;
    }

    // Check for Home Assistant specific URLs
    if (pathname.startsWith('/api/hassio_ingress/')) {
      console.log('C.A.F.E.: HA detected via Hassio ingress path');
      return true;
    }

    // Check for HA local path (only if it's specifically HA related)
    if (
      pathname.includes('/local/') &&
      (pathname.includes('/hacs/') || pathname.includes('/community/'))
    ) {
      console.log('C.A.F.E.: HA detected via HACS local path');
      return true;
    }

    // Check if we have specific HA window context
    if (hassWindow.__HA_ADDON__ || hassWindow.hassConnection || hassWindow.customCards) {
      console.log('C.A.F.E.: HA detected via window context properties');
      return true;
    }

    // Check for Home Assistant specific headers or document properties
    const documentElement = document.documentElement;
    if (
      documentElement.classList.contains('home-assistant') ||
      document.querySelector('home-assistant') ||
      document.querySelector('ha-panel-iframe')
    ) {
      console.log('C.A.F.E.: HA detected via DOM elements');
      return true;
    }

    console.log('C.A.F.E.: No HA detection triggers found', {
      pathname,
      hostname,
      hasWindowHass: !!hassWindow.hass,
      hasParentAccess: window.parent !== window,
    });
    return false;
  }, []);

  // Save config handler
  const setConfig = useCallback((newConfig: HassConfig) => {
    setConfigState(newConfig);
    saveConfig(newConfig);
    // Reset state when config changes
    setRemoteEntities([]);
    setRemoteServices({});
    setConnectionError(null);
  }, []);

  // Auto-configure for HA when detected
  useEffect(() => {
    if (isInHomeAssistant && !config.url && !config.token) {
      // Auto-configure for current HA instance
      const baseUrl = `${window.location.protocol}//${window.location.host}`;

      console.log('C.A.F.E.: Detected running in Home Assistant, attempting auto-configuration...');

      // Try to get auth token from HA context
      try {
        const hassWindow = window as unknown as {
          hass?: {
            auth?: { accessToken?: string };
            connection?: { accessToken?: string };
            user?: { access_token?: string };
          };
        };

        let token = hassWindow.hass?.auth?.accessToken;

        // Try alternative token locations
        if (!token) {
          token = hassWindow.hass?.connection?.accessToken;
        }
        if (!token) {
          token = hassWindow.hass?.user?.access_token;
        }

        // If no direct access, try parent window
        if (!token && window.parent && window.parent !== window) {
          try {
            const parentHass = (
              window.parent as unknown as {
                hass?: {
                  auth?: { accessToken?: string };
                  connection?: { accessToken?: string };
                  user?: { access_token?: string };
                };
              }
            ).hass;

            token =
              parentHass?.auth?.accessToken ||
              parentHass?.connection?.accessToken ||
              parentHass?.user?.access_token;
          } catch (e) {
            console.log('C.A.F.E.: Cross-origin access to parent blocked:', e);
          }
        }

        // Try accessing via top window
        if (!token && window.top && window.top !== window) {
          try {
            const topHass = (
              window.top as unknown as {
                hass?: {
                  auth?: { accessToken?: string };
                  connection?: { accessToken?: string };
                };
              }
            ).hass;

            token = topHass?.auth?.accessToken || topHass?.connection?.accessToken;
          } catch (e) {
            console.log('C.A.F.E.: Cross-origin access to top window blocked:', e);
          }
        }

        if (token) {
          console.log('C.A.F.E.: Successfully extracted auth token, configuring connection');
          setConfig({ url: baseUrl, token });
          return;
        } else {
          console.warn('C.A.F.E.: Could not extract auth token from HA context');
        }
      } catch (error) {
        console.warn('C.A.F.E.: Error during auth token extraction:', error);
      }

      // Fallback: Set URL and prompt user for token
      console.log(
        'C.A.F.E.: Setting URL without token, user will need to provide long-lived access token'
      );
      setConfig({ url: baseUrl, token: '' });
    }
  }, [isInHomeAssistant, config.url, config.token, setConfig]);

  const hasWindowHass =
    typeof window !== 'undefined' && !!(window as unknown as { hass?: unknown }).hass;

  // Determine the mode
  const isEmbedded = hasWindowHass || isInHomeAssistant;
  const hasRemoteConfig = !!(config.url && config.token);
  const isStandalone = !isEmbedded && !hasRemoteConfig;
  const isRemote = !isEmbedded && hasRemoteConfig;

  // Fetch data from remote HA instance using WebSocket
  useEffect(() => {
    if (!isRemote) return;

    console.log('C.A.F.E.: Establishing WebSocket connection to Home Assistant...', {
      url: config.url,
      hasToken: !!config.token,
    });

    const establishConnection = async () => {
      setIsLoading(true);
      setConnectionError(null);

      try {
        // Create WebSocket connection
        const auth = createLongLivedTokenAuth(config.url, config.token);
        const connection = await createConnection({ auth });

        console.log('C.A.F.E.: WebSocket connection established successfully');
        setWsConnection(connection);

        // Handle connection events (set these up before subscribing)
        connection.addEventListener('ready', () => {
          console.log('C.A.F.E.: WebSocket connection ready');
          setConnectionError(null);
          setIsLoading(false);
        });

        connection.addEventListener('disconnected', () => {
          console.log('C.A.F.E.: WebSocket connection disconnected');
          setConnectionError('Connection lost');
        });

        connection.addEventListener('reconnect-error', (err) => {
          console.error('C.A.F.E.: WebSocket reconnection failed:', err);
          setConnectionError('Reconnection failed');
        });

        // Subscribe to entity state changes
        const unsubscribeEntities = subscribeEntities(connection, (entities: HassEntities) => {
          const entitiesArray = Object.values(entities).map((entity) => ({
            entity_id: entity.entity_id,
            state: entity.state,
            attributes: entity.attributes || {},
            last_changed: entity.last_changed || '',
            last_updated: entity.last_updated || '',
          }));
          console.log('C.A.F.E.: Received entity updates:', entitiesArray.length, 'entities');
          setRemoteEntities(entitiesArray);
          // Also mark as loaded once we receive entities
          setIsLoading(false);
        });

        // Subscribe to service registry changes
        const unsubscribeServices = subscribeServices(connection, (services: HassServices) => {
          console.log('C.A.F.E.: Received service updates for domains:', Object.keys(services));
          setRemoteServices(services as Record<string, Record<string, HassService>>);
        });

        // Cleanup function
        return () => {
          console.log('C.A.F.E.: Cleaning up WebSocket connection');
          unsubscribeEntities();
          unsubscribeServices();
          connection.close();
          setWsConnection(null);
        };
      } catch (error) {
        console.error('C.A.F.E.: Failed to establish WebSocket connection:', error);
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        setConnectionError(errorMessage);
        setIsLoading(false);
      }
    };

    const cleanup = establishConnection();

    // Cleanup on unmount or config change
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then((cleanupFn) => cleanupFn?.());
      }
    };
  }, [isRemote, config.url, config.token]);

  // Build the hass API object
  const hass = useMemo<HassAPI>(() => {
    // Mode 1: Embedded in HA
    if (isEmbedded) {
      const hassWindow = window as unknown as { hass: HassAPI };
      return hassWindow.hass;
    }

    // Mode 2: Remote connection - use WebSocket API
    if (isRemote) {
      return {
        states: Object.fromEntries(remoteEntities.map((e) => [e.entity_id, e])),
        services: remoteServices,
        connection: wsConnection,
        callApi: async (method: string, path: string, data?: any) => {
          if (!config.url || !config.token) {
            throw new Error('No authentication configured');
          }

          // Use direct fetch for REST API calls
          const url = `${config.url}/api/${path}`;
          const response = await fetch(url, {
            method,
            headers: {
              'Authorization': `Bearer ${config.token}`,
              'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined,
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
          }

          return await response.json();
        },
        callService: async (domain, service, data) => {
          if (!wsConnection) {
            throw new Error('WebSocket connection not available');
          }
          return wsConnection.sendMessagePromise({
            type: 'call_service',
            domain,
            service,
            service_data: data || {},
          });
        },
      } as HassAPI;
    }

    // Mode 3: No config yet - return empty hass object
    return {
      states: {},
      services: {},
      callService: async () => {
        console.warn('No Home Assistant connection configured');
      },
    };
  }, [isEmbedded, isRemote, remoteEntities, remoteServices, wsConnection, config.url, config.token]);

  const entities = useMemo(() => Object.values(hass?.states ?? {}), [hass?.states]);

  const services = useMemo(() => hass?.services ?? {}, [hass?.services]);

  // Helper to get entities by domain
  const getEntitiesByDomain = useCallback(
    (domain: string) => entities.filter((e) => e.entity_id.startsWith(`${domain}.`)),
    [entities]
  );

  // Helper to get all available services as flat list
  const getAllServices = useCallback(() => {
    const result: Array<{ domain: string; service: string; definition: HassService }> = [];
    for (const [domain, domainServices] of Object.entries(services)) {
      for (const [service, definition] of Object.entries(domainServices)) {
        result.push({ domain, service, definition });
      }
    }
    return result;
  }, [services]);

  // Helper to get service definition by full service name (e.g., "light.turn_on")
  const getServiceDefinition = useCallback(
    (fullServiceName: string): HassService | null => {
      if (!fullServiceName || !fullServiceName.includes('.')) return null;
      const [domain, serviceName] = fullServiceName.split('.');
      return services[domain]?.[serviceName] || null;
    },
    [services]
  );

  return {
    hass,
    isStandalone,
    isEmbedded,
    isRemote,
    isLoading,
    connectionError,
    entities,
    services,
    config,
    setConfig,
    getEntitiesByDomain,
    getAllServices,
    getServiceDefinition,
  };
}
