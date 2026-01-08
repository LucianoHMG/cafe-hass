import { useState } from "react";
import { X, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { transpiler } from "@hflow/transpiler";
import { useFlowStore } from "@/store/flow-store";
import { cn } from "@/lib/utils";

interface ImportYamlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export function ImportYamlDialog({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportYamlDialogProps) {
  const [yamlText, setYamlText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const { fromFlowGraph } = useFlowStore();
  const { fitView } = useReactFlow();

  if (!isOpen) return null;

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setWarnings([]);

    try {
      // Parse YAML using the transpiler
      const result = transpiler.fromYaml(yamlText);

      if (!result.success) {
        setError(
          result.errors?.join("\n") || "Failed to parse YAML. Please check the format."
        );
        setImporting(false);
        return;
      }

      // Set warnings if any
      if (result.warnings.length > 0) {
        setWarnings(result.warnings);
      }

      // Import the graph
      if (result.graph) {
        fromFlowGraph(result.graph);

        // Center the viewport on the imported nodes
        setTimeout(() => {
          fitView({
            padding: 0.2,
            duration: 300,
          });
        }, 50);

        // Show success message briefly before closing
        setTimeout(() => {
          onImportSuccess?.();
          handleClose();
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setYamlText("");
    setError(null);
    setWarnings([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-slate-800">
            Import YAML Automation
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm text-slate-600 mb-4">
            Paste your Home Assistant automation YAML below. The automation can
            be in standard format or state machine format.
          </p>

          <textarea
            value={yamlText}
            onChange={(e) => setYamlText(e.target.value)}
            placeholder={`alias: My Automation
description: An example automation
trigger:
  - platform: state
    entity_id: light.living_room
    to: "on"
action:
  - service: notify.mobile_app
    data:
      message: "Light turned on!"`}
            className="w-full h-64 p-3 font-mono text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={importing}
          />

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Import Failed</p>
                <pre className="text-xs text-red-700 mt-1 whitespace-pre-wrap font-mono">
                  {error}
                </pre>
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 mb-1">
                    Warnings
                  </p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    {warnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Success state */}
          {importing && !error && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800">
                Successfully imported! Loading flow...
              </p>
            </div>
          )}

          {/* Help text */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> If your automation was created with Flow
              Automator, node positions will be preserved. Otherwise, nodes
              will be automatically arranged in a readable layout.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-slate-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
            disabled={importing}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!yamlText.trim() || importing}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-md transition-colors flex items-center gap-2",
              !yamlText.trim() || importing
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <Upload className="w-4 h-4" />
            {importing ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
