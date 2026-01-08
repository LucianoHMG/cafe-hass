import { Handle, type NodeProps, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { TriggerNodeData } from '@/store/flow-store';
import { useFlowStore } from '@/store/flow-store';

interface TriggerNodeProps extends NodeProps {
  data: TriggerNodeData;
}

export const TriggerNode = memo(function TriggerNode({ id, data, selected }: TriggerNodeProps) {
  const activeNodeId = useFlowStore((s) => s.activeNodeId);
  const isActive = activeNodeId === id;

  const platformLabels: Record<string, string> = {
    state: 'State Change',
    time: 'Time',
    time_pattern: 'Time Pattern',
    event: 'Event',
    mqtt: 'MQTT',
    webhook: 'Webhook',
    sun: 'Sun',
    zone: 'Zone',
    numeric_state: 'Numeric State',
    template: 'Template',
    homeassistant: 'Home Assistant',
    device: 'Device',
  };

  return (
    <div
      className={cn(
        'min-w-[180px] rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3',
        'transition-all duration-200',
        selected && 'ring-2 ring-amber-500 ring-offset-2',
        isActive && 'node-active ring-4 ring-green-500'
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <div className="rounded bg-amber-200 p-1">
          <Zap className="h-4 w-4 text-amber-700" />
        </div>
        <span className="font-semibold text-amber-900 text-sm">
          {data.alias || platformLabels[data.platform] || 'Trigger'}
        </span>
      </div>

      <div className="space-y-0.5 text-amber-700 text-xs">
        <div className="font-medium">{platformLabels[data.platform] || data.platform}</div>
        {data.entity_id && <div className="truncate opacity-75">{data.entity_id}</div>}
        {data.to && <div className="opacity-75">to: {data.to}</div>}
        {data.event_type && <div className="truncate opacity-75">{data.event_type}</div>}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-500 !border-amber-700"
      />
    </div>
  );
});
