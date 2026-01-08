import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConditionNodeData } from '@/store/flow-store';
import { useFlowStore } from '@/store/flow-store';

interface ConditionNodeProps extends NodeProps {
  data: ConditionNodeData;
}

export const ConditionNode = memo(function ConditionNode({
  id,
  data,
  selected,
}: ConditionNodeProps) {
  const activeNodeId = useFlowStore((s) => s.activeNodeId);
  const isActive = activeNodeId === id;

  const conditionLabels: Record<string, string> = {
    state: 'State',
    numeric_state: 'Numeric',
    template: 'Template',
    time: 'Time',
    zone: 'Zone',
    sun: 'Sun',
    and: 'AND',
    or: 'OR',
    not: 'NOT',
    device: 'Device',
  };

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-blue-50 border-blue-400 min-w-[180px] relative',
        'transition-all duration-200',
        selected && 'ring-2 ring-blue-500 ring-offset-2',
        isActive && 'node-active ring-4 ring-green-500'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-500 !border-blue-700"
      />

      <div className="flex items-center gap-2 mb-1">
        <div className="p-1 rounded bg-blue-200">
          <GitBranch className="w-4 h-4 text-blue-700" />
        </div>
        <span className="font-semibold text-blue-900 text-sm">
          {data.alias || conditionLabels[data.condition_type] || 'Condition'}
        </span>
      </div>

      <div className="text-xs text-blue-700 space-y-0.5">
        <div className="font-medium">
          {conditionLabels[data.condition_type] || data.condition_type}
        </div>
        {data.entity_id && (
          <div className="truncate opacity-75">{data.entity_id}</div>
        )}
        {data.state && <div className="opacity-75">= {data.state}</div>}
        {data.above !== undefined && <div className="opacity-75">&gt; {data.above}</div>}
        {data.below !== undefined && <div className="opacity-75">&lt; {data.below}</div>}
        {data.after && <div className="opacity-75">after: {data.after}</div>}
        {data.before && <div className="opacity-75">before: {data.before}</div>}
        {data.zone && <div className="opacity-75">zone: {data.zone}</div>}
        {data.attribute && <div className="opacity-75">attr: {data.attribute}</div>}
        {data.for && (
          <div className="opacity-75">
            for: {typeof data.for === 'string' ? data.for : `${data.for.hours || 0}h ${data.for.minutes || 0}m ${data.for.seconds || 0}s`}
          </div>
        )}
        {data.template && (
          <div className="truncate opacity-75 font-mono text-[10px]">
            {data.template.slice(0, 30)}...
          </div>
        )}
        {data.value_template && (
          <div className="truncate opacity-75 font-mono text-[10px]">
            {data.value_template.slice(0, 30)}...
          </div>
        )}
      </div>

      {/* True/False output handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '30%' }}
        className="!w-3 !h-3 !bg-green-500 !border-green-700"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '70%' }}
        className="!w-3 !h-3 !bg-red-500 !border-red-700"
      />
      
      {/* Labels for handles */}
      <div className="absolute right-[-35px] top-[30%] transform -translate-y-1/2 text-[10px] font-medium text-green-700 bg-white px-1 py-0.5 rounded border border-green-200 shadow-sm">
        Yes
      </div>
      <div className="absolute right-[-30px] top-[70%] transform -translate-y-1/2 text-[10px] font-medium text-red-700 bg-white px-1 py-0.5 rounded border border-red-200 shadow-sm">
        No
      </div>
    </div>
  );
});
