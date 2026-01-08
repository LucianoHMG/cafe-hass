import { Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { EntitySelector } from '@/components/ui/EntitySelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useHass } from '@/hooks/useHass';
import { useFlowStore } from '@/store/flow-store';

export function PropertyPanel() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeNode = useFlowStore((s) => s.removeNode);
  const { hass, entities, getAllServices, getServiceDefinition } = useHass();

  // Use entities from hass object directly
  const effectiveEntities = useMemo(() => {
    if (hass?.states && Object.keys(hass.states).length > 0) {
      return Object.values(hass.states).map((state: any) => ({
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes || {},
        last_changed: state.last_changed || '',
        last_updated: state.last_updated || '',
      }));
    }
    return entities;
  }, [hass, entities]);

  console.log(
    'C.A.F.E. PropertyPanel: Using entities:',
    effectiveEntities.length,
    'from hass object'
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  if (!selectedNode) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Select a node to edit its properties
      </div>
    );
  }

  const handleChange = (key: string, value: unknown) => {
    updateNodeData(selectedNode.id, { [key]: value });
  };

  // Handle platform change - clear fields that don't apply to the new platform
  const handlePlatformChange = (newPlatform: string) => {
    const currentData = selectedNode.data as Record<string, unknown>;

    // Build new data with only the alias and platform
    const newData: Record<string, unknown> = {
      alias: currentData.alias,
      platform: newPlatform,
    };

    // Clear all other fields by setting them to undefined
    const allPossibleFields = [
      'entity_id',
      'to',
      'from',
      'for',
      'at',
      'event_type',
      'event_data',
      'event',
      'offset',
      'above',
      'below',
      'value_template',
      'template',
      'webhook_id',
      'zone',
      'topic',
      'payload',
      'hours',
      'minutes',
      'seconds',
    ];

    for (const field of allPossibleFields) {
      newData[field] = undefined;
    }

    updateNodeData(selectedNode.id, newData);
  };

  const triggerPlatform =
    selectedNode.type === 'trigger'
      ? ((selectedNode.data as Record<string, unknown>).platform as string)
      : null;

  const handleNestedChange = (parent: string, key: string, value: unknown) => {
    const parentData = (selectedNode.data as Record<string, unknown>)[parent] || {};
    updateNodeData(selectedNode.id, {
      [parent]: { ...(parentData as Record<string, unknown>), [key]: value },
    });
  };

  return (
    <div className="h-full flex-1 space-y-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm">
          {selectedNode.type
            ? selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)
            : 'Node'}{' '}
          Properties
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeNode(selectedNode.id)}
          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Common: Alias */}
      <div className="space-y-2">
        <Label className="font-medium text-muted-foreground text-xs">Alias (Display Name)</Label>
        <Input
          type="text"
          value={((selectedNode.data as Record<string, unknown>).alias as string) || ''}
          onChange={(e) => handleChange('alias', e.target.value)}
          placeholder="Optional display name"
        />
      </div>

      {/* Trigger-specific fields */}
      {selectedNode.type === 'trigger' && (
        <>
          <div className="space-y-2">
            <Label className="font-medium text-muted-foreground text-xs">Platform</Label>
            <Select
              value={triggerPlatform || 'state'}
              onValueChange={(value) => handlePlatformChange(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="state">State Change</SelectItem>
                <SelectItem value="numeric_state">Numeric State</SelectItem>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="sun">Sun</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="template">Template</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* State trigger fields */}
          {(triggerPlatform === 'state' || triggerPlatform === 'numeric_state') && (
            <>
              <div className="space-y-2">
                <Label className="font-medium text-muted-foreground text-xs">Entity</Label>
                <EntitySelector
                  value={((selectedNode.data as Record<string, unknown>).entity_id as string) || ''}
                  onChange={(value) => handleChange('entity_id', value)}
                  entities={effectiveEntities}
                  placeholder="Select entity..."
                />
              </div>
              {triggerPlatform === 'state' && (
                <>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">To State</Label>
                    <Input
                      type="text"
                      value={((selectedNode.data as Record<string, unknown>).to as string) || ''}
                      onChange={(e) => handleChange('to', e.target.value)}
                      placeholder="e.g., on, off, home"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">
                      From State (optional)
                    </Label>
                    <Input
                      type="text"
                      value={((selectedNode.data as Record<string, unknown>).from as string) || ''}
                      onChange={(e) => handleChange('from', e.target.value)}
                      placeholder="e.g., off"
                    />
                  </div>
                </>
              )}
              {triggerPlatform === 'numeric_state' && (
                <>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">Above</Label>
                    <Input
                      type="text"
                      value={((selectedNode.data as Record<string, unknown>).above as string) || ''}
                      onChange={(e) => handleChange('above', e.target.value)}
                      placeholder="e.g., 20"
                    />
                  </div>
                  <div>
                    <Label className="font-medium text-muted-foreground text-xs">Below</Label>
                    <Input
                      type="text"
                      value={((selectedNode.data as Record<string, unknown>).below as string) || ''}
                      onChange={(e) => handleChange('below', e.target.value)}
                      placeholder="e.g., 30"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Time trigger fields */}
          {triggerPlatform === 'time' && (
            <div className="space-y-2">
              <Label className="font-medium text-muted-foreground text-xs">At (time)</Label>
              <Input
                type="text"
                value={((selectedNode.data as Record<string, unknown>).at as string) || ''}
                onChange={(e) => handleChange('at', e.target.value)}
                placeholder="e.g., 07:00:00 or input_datetime.wake_up"
              />
            </div>
          )}

          {/* Sun trigger fields */}
          {triggerPlatform === 'sun' && (
            <>
              <div className="space-y-2">
                <Label className="font-medium text-muted-foreground text-xs">Event</Label>
                <Select
                  value={
                    ((selectedNode.data as Record<string, unknown>).event as string) || 'sunset'
                  }
                  onValueChange={(value) => handleChange('event', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunrise">Sunrise</SelectItem>
                    <SelectItem value="sunset">Sunset</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-medium text-muted-foreground text-xs">
                  Offset (optional)
                </Label>
                <Input
                  type="text"
                  value={((selectedNode.data as Record<string, unknown>).offset as string) || ''}
                  onChange={(e) => handleChange('offset', e.target.value)}
                  placeholder="e.g., -00:30:00"
                />
              </div>
            </>
          )}

          {/* Event trigger fields */}
          {triggerPlatform === 'event' && (
            <div className="space-y-2">
              <Label className="font-medium text-muted-foreground text-xs">Event Type</Label>
              <Input
                type="text"
                value={((selectedNode.data as Record<string, unknown>).event_type as string) || ''}
                onChange={(e) => handleChange('event_type', e.target.value)}
                placeholder="e.g., zha_event, call_service"
              />
            </div>
          )}

          {/* Template trigger fields */}
          {triggerPlatform === 'template' && (
            <div className="space-y-2">
              <Label className="font-medium text-muted-foreground text-xs">Value Template</Label>
              <Textarea
                value={
                  ((selectedNode.data as Record<string, unknown>).value_template as string) || ''
                }
                onChange={(e) => handleChange('value_template', e.target.value)}
                className="font-mono"
                rows={3}
                placeholder="{{ states('sensor.temperature') | float > 25 }}"
              />
            </div>
          )}
        </>
      )}

      {/* Condition-specific fields */}
      {selectedNode.type === 'condition' &&
        (() => {
          const conditionType =
            ((selectedNode.data as Record<string, unknown>).condition_type as string) || 'state';

          return (
            <>
              <div className="space-y-2">
                <Label className="font-medium text-muted-foreground text-xs">Condition Type</Label>
                <Select
                  value={conditionType}
                  onValueChange={(value) => handleChange('condition_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="state">State</SelectItem>
                    <SelectItem value="numeric_state">Numeric State</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="sun">Sun</SelectItem>
                    <SelectItem value="zone">Zone</SelectItem>
                    <SelectItem value="device">Device</SelectItem>
                    <SelectItem value="and">AND</SelectItem>
                    <SelectItem value="or">OR</SelectItem>
                    <SelectItem value="not">NOT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Common fields for entity-based conditions */}
              {['state', 'numeric_state'].includes(conditionType) && (
                <div className="space-y-2">
                  <Label className="font-medium text-muted-foreground text-xs">Entity</Label>
                  <EntitySelector
                    value={
                      ((selectedNode.data as Record<string, unknown>).entity_id as string) || ''
                    }
                    onChange={(value) => handleChange('entity_id', value)}
                    entities={effectiveEntities}
                    placeholder="Select entity..."
                  />
                </div>
              )}

              {/* State condition fields */}
              {conditionType === 'state' && (
                <>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">State</Label>
                    <Input
                      type="text"
                      value={((selectedNode.data as Record<string, unknown>).state as string) || ''}
                      onChange={(e) => handleChange('state', e.target.value)}
                      placeholder="e.g., on, below_horizon"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">
                      Attribute (optional)
                    </Label>
                    <Input
                      type="text"
                      value={
                        ((selectedNode.data as Record<string, unknown>).attribute as string) || ''
                      }
                      onChange={(e) => handleChange('attribute', e.target.value)}
                      placeholder="e.g., brightness, temperature"
                    />
                  </div>
                </>
              )}

              {/* Numeric state condition fields */}
              {conditionType === 'numeric_state' && (
                <>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">
                      Above (optional)
                    </Label>
                    <Input
                      type="number"
                      value={((selectedNode.data as Record<string, unknown>).above as number) || ''}
                      onChange={(e) =>
                        handleChange('above', e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="Minimum value"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">
                      Below (optional)
                    </Label>
                    <Input
                      type="number"
                      value={((selectedNode.data as Record<string, unknown>).below as number) || ''}
                      onChange={(e) =>
                        handleChange('below', e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="Maximum value"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">
                      Attribute (optional)
                    </Label>
                    <Input
                      type="text"
                      value={
                        ((selectedNode.data as Record<string, unknown>).attribute as string) || ''
                      }
                      onChange={(e) => handleChange('attribute', e.target.value)}
                      placeholder="e.g., brightness, temperature"
                    />
                  </div>
                </>
              )}

              {/* Template condition fields */}
              {conditionType === 'template' && (
                <div className="space-y-2">
                  <Label className="font-medium text-muted-foreground text-xs">
                    Value Template
                  </Label>
                  <Textarea
                    value={
                      ((selectedNode.data as Record<string, unknown>).value_template as string) ||
                      ''
                    }
                    onChange={(e) => handleChange('value_template', e.target.value)}
                    placeholder="{{ states('sensor.temperature') | float > 20 }}"
                    rows={3}
                  />
                </div>
              )}

              {/* Time condition fields */}
              {conditionType === 'time' && (
                <>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">
                      After (optional)
                    </Label>
                    <Input
                      type="time"
                      value={((selectedNode.data as Record<string, unknown>).after as string) || ''}
                      onChange={(e) => handleChange('after', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">
                      Before (optional)
                    </Label>
                    <Input
                      type="time"
                      value={
                        ((selectedNode.data as Record<string, unknown>).before as string) || ''
                      }
                      onChange={(e) => handleChange('before', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">
                      Weekday (optional)
                    </Label>
                    <Input
                      type="text"
                      value={
                        ((selectedNode.data as Record<string, unknown>).weekday as string) || ''
                      }
                      onChange={(e) => handleChange('weekday', e.target.value)}
                      placeholder="mon,tue,wed,thu,fri,sat,sun"
                    />
                  </div>
                </>
              )}

              {/* Zone condition fields */}
              {conditionType === 'zone' && (
                <>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">Entity</Label>
                    <EntitySelector
                      value={
                        ((selectedNode.data as Record<string, unknown>).entity_id as string) || ''
                      }
                      onChange={(value) => handleChange('entity_id', value)}
                      entities={effectiveEntities}
                      placeholder="Select person or device tracker..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">Zone</Label>
                    <Input
                      type="text"
                      value={((selectedNode.data as Record<string, unknown>).zone as string) || ''}
                      onChange={(e) => handleChange('zone', e.target.value)}
                      placeholder="zone.home"
                    />
                  </div>
                </>
              )}

              {/* Device condition fields */}
              {conditionType === 'device' && (
                <>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">Device ID</Label>
                    <Input
                      type="text"
                      value={
                        ((selectedNode.data as Record<string, unknown>).device_id as string) || ''
                      }
                      onChange={(e) => handleChange('device_id', e.target.value)}
                      placeholder="Device ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">Domain</Label>
                    <Input
                      type="text"
                      value={
                        ((selectedNode.data as Record<string, unknown>).domain as string) || ''
                      }
                      onChange={(e) => handleChange('domain', e.target.value)}
                      placeholder="e.g., binary_sensor, sensor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-muted-foreground text-xs">Type</Label>
                    <Input
                      type="text"
                      value={((selectedNode.data as Record<string, unknown>).type as string) || ''}
                      onChange={(e) => handleChange('type', e.target.value)}
                      placeholder="e.g., button_short_press"
                    />
                  </div>
                </>
              )}

              {/* Common duration field */}
              {['state', 'numeric_state', 'zone'].includes(conditionType) && (
                <div className="space-y-2">
                  <Label className="font-medium text-muted-foreground text-xs">
                    For Duration (optional)
                  </Label>
                  <Input
                    type="text"
                    value={((selectedNode.data as Record<string, unknown>).for as string) || ''}
                    onChange={(e) => handleChange('for', e.target.value)}
                    placeholder="00:05:00 or 5 minutes"
                  />
                </div>
              )}
            </>
          );
        })()}

      {/* Action-specific fields */}
      {selectedNode.type === 'action' &&
        (() => {
          const serviceName =
            ((selectedNode.data as Record<string, unknown>).service as string) || '';
          const serviceDefinition = getServiceDefinition(serviceName);
          const serviceFields = serviceDefinition?.fields || {};
          const currentData =
            ((selectedNode.data as Record<string, unknown>).data as Record<string, unknown>) || {};

          const handleDataFieldChange = (fieldName: string, value: unknown) => {
            const newData = { ...currentData, [fieldName]: value === '' ? undefined : value };
            // Clean up undefined values
            const cleanedData = Object.fromEntries(
              Object.entries(newData).filter(([, v]) => v !== undefined && v !== '')
            );
            handleChange('data', Object.keys(cleanedData).length > 0 ? cleanedData : undefined);
          };

          return (
            <>
              <div className="space-y-2">
                <Label className="font-medium text-muted-foreground text-xs">Service</Label>
                <Select
                  value={serviceName}
                  onValueChange={(value) => {
                    handleChange('service', value);
                    // Clear data when service changes
                    handleChange('data', undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllServices().map(({ domain, service }) => (
                      <SelectItem key={`${domain}.${service}`} value={`${domain}.${service}`}>
                        {domain}.{service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Entity */}
              {serviceDefinition?.target && (
                <div className="space-y-2">
                  <Label className="font-medium text-muted-foreground text-xs">Target Entity</Label>
                  <EntitySelector
                    value={
                      ((
                        (selectedNode.data as Record<string, unknown>).target as Record<
                          string,
                          unknown
                        >
                      )?.entity_id as string) || ''
                    }
                    onChange={(value) => handleNestedChange('target', 'entity_id', value)}
                    entities={effectiveEntities}
                    placeholder="Select target entity..."
                  />
                </div>
              )}

              {/* Dynamic service fields */}
              {Object.keys(serviceFields).length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <h4 className="mb-3 font-semibold text-muted-foreground text-xs">Service Data</h4>
                  {Object.entries(serviceFields).map(([fieldName, field]) => {
                    const selector = field.selector || {};
                    const selectorType = Object.keys(selector)[0];
                    const selectorConfig = selector[selectorType] || {};
                    const currentValue = currentData[fieldName];

                    // Use field.name if available, otherwise format fieldName as label
                    const fieldLabel =
                      field.name ||
                      fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

                    // Render input based on selector type
                    if (selectorType === 'number') {
                      const config = selectorConfig as {
                        min?: number;
                        max?: number;
                        unit_of_measurement?: string;
                      };
                      return (
                        <div key={fieldName} className="mb-3">
                          <Label className="mb-1 font-medium text-muted-foreground text-xs">
                            {fieldLabel}
                            {config.unit_of_measurement && (
                              <span className="ml-1 text-muted-foreground">
                                ({config.unit_of_measurement})
                              </span>
                            )}
                          </Label>
                          <Input
                            type="number"
                            value={(currentValue as number) ?? ''}
                            onChange={(e) =>
                              handleDataFieldChange(
                                fieldName,
                                e.target.value ? Number(e.target.value) : ''
                              )
                            }
                            min={config.min}
                            max={config.max}
                            placeholder={field.example !== undefined ? String(field.example) : ''}
                          />
                          {field.description && (
                            <p className="mt-0.5 text-muted-foreground text-xs">
                              {field.description}
                            </p>
                          )}
                        </div>
                      );
                    }

                    if (selectorType === 'select') {
                      const config = selectorConfig as { options?: string[] };
                      return (
                        <div key={fieldName} className="mb-3">
                          <Label className="mb-1 font-medium text-muted-foreground text-xs">
                            {fieldLabel}
                          </Label>
                          <Select
                            value={(currentValue as string) ?? ''}
                            onValueChange={(value) => handleDataFieldChange(fieldName, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {config.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }

                    if (selectorType === 'boolean') {
                      return (
                        <div key={fieldName} className="mb-3 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={(currentValue as boolean) ?? false}
                            onChange={(e) => handleDataFieldChange(fieldName, e.target.checked)}
                            className="rounded"
                          />
                          <Label className="font-medium text-muted-foreground text-xs">
                            {fieldLabel}
                          </Label>
                        </div>
                      );
                    }

                    // Default: text input (for text, color_rgb, etc.)
                    return (
                      <div key={fieldName} className="mb-3">
                        <Label className="mb-1 font-medium text-muted-foreground text-xs">
                          {fieldLabel}
                          {field.required && <span className="ml-0.5 text-destructive">*</span>}
                        </Label>
                        <Input
                          type="text"
                          value={(currentValue as string) ?? ''}
                          onChange={(e) => handleDataFieldChange(fieldName, e.target.value)}
                          placeholder={field.example !== undefined ? String(field.example) : ''}
                        />
                        {field.description && (
                          <p className="mt-0.5 text-muted-foreground text-xs">
                            {field.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}

      {/* Delay-specific fields */}
      {selectedNode.type === 'delay' && (
        <div className="space-y-2">
          <Label className="font-medium text-muted-foreground text-xs">Delay (HH:MM:SS)</Label>
          <Input
            type="text"
            value={((selectedNode.data as Record<string, unknown>).delay as string) || '00:00:05'}
            onChange={(e) => handleChange('delay', e.target.value)}
            placeholder="00:00:05"
          />
        </div>
      )}

      {/* Wait-specific fields */}
      {selectedNode.type === 'wait' && (
        <>
          <div className="space-y-2">
            <Label className="font-medium text-muted-foreground text-xs">Wait Template</Label>
            <Textarea
              value={((selectedNode.data as Record<string, unknown>).wait_template as string) || ''}
              onChange={(e) => handleChange('wait_template', e.target.value)}
              className="font-mono"
              rows={3}
              placeholder="{{ is_state('sensor.x', 'on') }}"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium text-muted-foreground text-xs">Timeout</Label>
            <Input
              type="text"
              value={
                ((selectedNode.data as Record<string, unknown>).timeout as string) || '00:01:00'
              }
              onChange={(e) => handleChange('timeout', e.target.value)}
              placeholder="00:01:00"
            />
          </div>
        </>
      )}

      <div className="pt-2 text-muted-foreground text-xs">Node ID: {selectedNode.id}</div>
    </div>
  );
}
