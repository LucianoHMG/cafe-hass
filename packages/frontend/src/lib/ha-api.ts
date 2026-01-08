export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
}

export interface HassConnection {
  sendMessagePromise: (message: any) => Promise<any>;
}

export interface HassConfig {
  entities?: Record<string, HassEntity>;
  states?: Record<string, HassEntity>;
  callApi?: (method: string, path: string, parameters?: any) => Promise<any>;
  callService?: (domain: string, service: string, serviceData?: any, target?: any) => Promise<any>;
  connection?: HassConnection;
}

export interface AutomationConfig {
  id?: string;
  alias?: string;
  description?: string;
  triggers?: any[];
  trigger?: any[];
  conditions?: any[];
  condition?: any[];
  actions?: any[];
  action?: any[];
  mode?: string;
  max?: number;
  variables?: Record<string, any>;
}

/**
 * Home Assistant API abstraction layer
 * Works in both custom panel mode (with hass object) and standalone mode
 */
export class HomeAssistantAPI {
  private hass: HassConfig | null = null;
  private connection: HassConnection | null = null;

  constructor(hass?: HassConfig) {
    this.hass = hass || null;
    this.connection = hass?.connection || null;
  }

  /**
   * Update the hass reference (for when it changes)
   */
  updateHass(hass: HassConfig | null) {
    this.hass = hass;
    this.connection = hass?.connection || null;
  }

  /**
   * Check if we have a valid connection
   */
  isConnected(): boolean {
    return !!(this.hass && (this.hass.connection || this.hass.callApi));
  }

  /**
   * Get all entity states
   */
  getStates(): Record<string, HassEntity> | null {
    return this.hass?.states || this.hass?.entities || null;
  }

  /**
   * Get a specific entity state
   */
  getState(entityId: string): HassEntity | null {
    const states = this.getStates();
    return states?.[entityId] || null;
  }

  /**
   * Get all automation entities
   */
  getAutomations(): HassEntity[] {
    const states = this.getStates();
    if (!states) return [];

    return Object.values(states).filter((entity) => entity.entity_id.startsWith('automation.'));
  }

  /**
   * Send a websocket message
   */
  async sendMessage(message: any): Promise<any> {
    if (!this.connection) {
      throw new Error('No Home Assistant connection available');
    }

    return await this.connection.sendMessagePromise(message);
  }

  /**
   * Call a Home Assistant service
   */
  async callService(
    domain: string,
    service: string,
    serviceData?: any,
    target?: any
  ): Promise<any> {
    if (this.hass?.callService) {
      // Use built-in service calling (custom panel mode)
      return await this.hass.callService(domain, service, serviceData, target);
    } else if (this.connection) {
      // Use websocket message (standalone mode)
      return await this.sendMessage({
        type: 'call_service',
        domain,
        service,
        service_data: serviceData,
        target,
      });
    } else {
      throw new Error('No service calling method available');
    }
  }

  /**
   * Call Home Assistant REST API
   */
  async callAPI(method: string, path: string, data?: any): Promise<any> {
    if (this.hass?.callApi) {
      // Use built-in API calling (custom panel mode)
      return await this.hass.callApi(method, path, data);
    } else {
      // In standalone mode, we'd need to implement HTTP requests
      // For now, throw an error as this requires auth tokens
      throw new Error('REST API calls not supported in standalone mode');
    }
  }

  /**
   * Get automation configurations
   */
  async getAutomationConfigs(): Promise<AutomationConfig[]> {
    try {
      const result = await this.sendMessage({
        type: 'config/automation/config',
      });

      if (Array.isArray(result)) {
        return result;
      }

      return [];
    } catch (error) {
      console.error('Failed to get automation configs:', error);
      return [];
    }
  }

  /**
   * Get a specific automation configuration
   */
  async getAutomationConfig(automationId: string): Promise<AutomationConfig | null> {
    try {
      const configs = await this.getAutomationConfigs();
      return (
        configs.find((config) => config.id === automationId || config.alias === automationId) ||
        null
      );
    } catch (error) {
      console.error('Failed to get automation config:', error);
      return null;
    }
  }

  /**
   * Get automation trace (fallback method for getting config)
   */
  async getAutomationTrace(automationId: string): Promise<any> {
    try {
      const result = await this.sendMessage({
        type: 'automation/trace/get',
        automation_id: automationId,
      });

      if (Array.isArray(result) && result.length > 0) {
        return result[0].config;
      }

      return null;
    } catch (error) {
      console.error('Failed to get automation trace:', error);
      return null;
    }
  }

  /**
   * Get automation configuration with multiple fallback methods
   */
  async getAutomationConfigWithFallback(
    automationId: string,
    alias?: string
  ): Promise<AutomationConfig | null> {
    try {
      // Method 1: Try to get from automation config list
      let config = await this.getAutomationConfig(automationId);

      if (config) {
        return config;
      }

      // Method 2: Try to find by alias if provided
      if (alias) {
        const configs = await this.getAutomationConfigs();
        config = configs.find((cfg) => cfg.alias === alias) || null;
        if (config) {
          return config;
        }
      }

      // Method 3: Try to get from automation trace
      config = await this.getAutomationTrace(automationId);
      if (config) {
        return config;
      }

      console.warn(`Could not find automation config for: ${automationId}`);
      return null;
    } catch (error) {
      console.error('Failed to get automation config with fallback:', error);
      return null;
    }
  }

  /**
   * Trigger an automation
   */
  async triggerAutomation(entityId: string, skipCondition = true): Promise<void> {
    await this.callService('automation', 'trigger', {
      entity_id: entityId,
      skip_condition: skipCondition,
    });
  }

  /**
   * Turn automation on/off
   */
  async setAutomationState(entityId: string, enabled: boolean): Promise<void> {
    const service = enabled ? 'turn_on' : 'turn_off';
    await this.callService('automation', service, {
      entity_id: entityId,
    });
  }

  /**
   * Get areas
   */
  async getAreas(): Promise<any[]> {
    try {
      return await this.sendMessage({ type: 'config/area_registry/list' });
    } catch (error) {
      console.error('Failed to get areas:', error);
      return [];
    }
  }

  /**
   * Get devices
   */
  async getDevices(): Promise<any[]> {
    try {
      return await this.sendMessage({ type: 'config/device_registry/list' });
    } catch (error) {
      console.error('Failed to get devices:', error);
      return [];
    }
  }

  /**
   * Get entities registry
   */
  async getEntities(): Promise<any[]> {
    try {
      return await this.sendMessage({ type: 'config/entity_registry/list' });
    } catch (error) {
      console.error('Failed to get entities:', error);
      return [];
    }
  }

  /**
   * Get services
   */
  async getServices(): Promise<any> {
    try {
      return await this.sendMessage({ type: 'get_services' });
    } catch (error) {
      console.error('Failed to get services:', error);
      return {};
    }
  }

  /**
   * Validate automation config
   */
  async validateAutomationConfig(config: {
    trigger?: any;
    condition?: any;
    action?: any;
  }): Promise<any> {
    try {
      return await this.sendMessage({
        type: 'validate_config',
        ...config,
      });
    } catch (error) {
      console.error('Failed to validate config:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }
}

// Global API instance
let haAPI: HomeAssistantAPI | null = null;

/**
 * Get the global Home Assistant API instance
 */
export function getHomeAssistantAPI(hass?: HassConfig): HomeAssistantAPI {
  if (!haAPI) {
    haAPI = new HomeAssistantAPI(hass);
  } else if (hass) {
    haAPI.updateHass(hass);
  }
  return haAPI;
}

/**
 * Initialize API for standalone mode
 */
export function initializeStandaloneAPI(): HomeAssistantAPI {
  haAPI = new HomeAssistantAPI();
  return haAPI;
}

/**
 * Reset the API instance (useful for testing)
 */
export function resetAPI(): void {
  haAPI = null;
}
