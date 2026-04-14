import { useMemo, useState } from "react";
import { Input, Label, Switch, Text, Select, Button } from "@medusajs/ui";
import { useZones } from "../../../hooks/api/zones";
import { useStockLocations } from "../../../hooks/api/stock-locations";
import { FileUpload, FileType } from "../../../components/common/file-upload";

export type ControlFormData = {
  scope: 'zone' | 'darkstore';
  scope_id: string;
  is_active: boolean;
  is_instant_enabled: boolean;
  is_slotted_enabled: boolean;
  delay_minutes: number;
  delay_message: string | null;
  reason: Record<string, unknown> | null;
}

export type MessageIconFile = {
  base64Content: string;
  file: { type: string; name: string };
}

export type ControlFormPayload = ControlFormData & {
  message_icon_file?: MessageIconFile;
}

export type ControlFormProps = {
  mode: 'create' | 'edit';
  initialValues: ControlFormData;
  existingIconUrl?: string | null;
  submitting?: boolean;
  onSubmit: (payload: ControlFormPayload) => Promise<void> | void;
  onCancel?: () => void;
}

export const ControlForm = ({ mode, initialValues, existingIconUrl, submitting, onSubmit, onCancel }: ControlFormProps) => {
  const [formData, setFormData] = useState<ControlFormData>({ ...initialValues });
  const [messageIconFiles, setMessageIconFiles] = useState<FileType[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: zonesData, isLoading: zonesLoading } = useZones();
  const zones = zonesData?.zones || [];
  const { stock_locations: stockLocations = [], isLoading: locationsLoading } = useStockLocations();

  const scopeOptions = useMemo(() => ([
    { value: 'zone', label: 'Zone' },
    { value: 'darkstore', label: 'Darkstore' },
  ]), []);

  const scopeIdOptions = useMemo(() => {
    if (formData.scope === 'zone') {
      return zones.map((z: any) => ({ value: z.id, label: `${z.name}` }));
    }
    return stockLocations.map((l: any) => ({ value: l.id, label: `${l.name}` }));
  }, [formData.scope, zones, stockLocations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.scope) newErrors.scope = 'Scope is required';
    if (!formData.scope_id) newErrors.scope_id = 'Scope ID is required';

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    const cleanedData: ControlFormPayload = {
      ...formData,
      delay_message: formData.delay_message?.trim() || null,
      delay_minutes: Number(formData.delay_minutes) || 0,
    };

    if (messageIconFiles.length > 0 && messageIconFiles[0].base64Content) {
      cleanedData.message_icon_file = {
        base64Content: messageIconFiles[0].base64Content,
        file: {
          type: messageIconFiles[0].file.type,
          name: messageIconFiles[0].file.name,
        },
      };
    }

    await onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="scope" className="text-sm font-medium">Scope *</Label>
          <Select value={formData.scope} onValueChange={(v) => {
            setFormData((prev) => ({ ...prev, scope: v as 'zone' | 'darkstore', scope_id: '' }));
            setErrors((e) => ({ ...e, scope: '', scope_id: '' }));
          }} disabled={zonesLoading}>
            <Select.Trigger className={errors.scope ? 'border-red-500' : ''}>
              <Select.Value placeholder="Select scope (zone or darkstore)" />
            </Select.Trigger>
            <Select.Content>
              {scopeOptions.map(o => <Select.Item key={o.value} value={o.value}>{o.label}</Select.Item>)}
            </Select.Content>
          </Select>
          {errors.scope && <Text className="text-xs text-red-500 mt-1">{errors.scope}</Text>}
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_active: checked }))} />
          <Label htmlFor="is_active" className="text-sm font-medium">Active Control</Label>
        </div>
      </div>

      {formData.scope && (
        <div>
          <Label htmlFor="scope_id" className="text-sm font-medium">{formData.scope === 'zone' ? 'Zone' : 'Darkstore'} *</Label>
          <Select value={formData.scope_id} onValueChange={(v) => {
            setFormData((p) => ({ ...p, scope_id: v }));
            setErrors((e) => ({ ...e, scope_id: '' }));
          }} disabled={scopeIdOptions.length === 0}>
            <Select.Trigger className={errors.scope_id ? 'border-red-500' : ''}>
              <Select.Value placeholder={formData.scope === 'zone' ? (zonesLoading ? 'Loading zones...' : 'Select a zone') : (locationsLoading ? 'Loading darkstores...' : 'Select a darkstore')} />
            </Select.Trigger>
            <Select.Content>
              {scopeIdOptions.map((o: any) => (
                <Select.Item key={o.value} value={o.value}>{o.label}</Select.Item>
              ))}
            </Select.Content>
          </Select>
          {errors.scope_id && <Text className="text-xs text-red-500 mt-1">{errors.scope_id}</Text>}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 border border-ui-border-base rounded-lg">
          <div>
            <Label htmlFor="is_instant_enabled">Instant Promise Active</Label>
            <Text className="text-xs text-ui-fg-muted">If disabled - all pincodes of selected store / zone will become unserviceable</Text>
          </div>
          <Switch checked={formData.is_instant_enabled} onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_instant_enabled: checked }))} />
        </div>
        <div className="flex items-center justify-between p-3 border border-ui-border-base rounded-lg">
          <div>
            <Label htmlFor="is_slotted_enabled">Slotted Delivery Active</Label>
            <Text className="text-xs text-ui-fg-muted">If disabled - all pincodes of selected store / zone will become unserviceable</Text>
          </div>
          <Switch checked={formData.is_slotted_enabled} onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_slotted_enabled: checked }))} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="delay_minutes" className="text-sm font-medium">Delay (minutes)</Label>
          <Input type="number" placeholder="0" value={formData.delay_minutes} onChange={(e) => setFormData((p) => ({ ...p, delay_minutes: parseInt(e.target.value) || 0 }))} min="0" />
          <Text className="text-xs text-ui-fg-muted mt-1">Additional delay to add to delivery promises</Text>
        </div>
      </div>

      <div>
        <Label htmlFor="delay_message" className="text-sm font-medium">Delay Message</Label>
        <Input placeholder="Optional delay message" value={formData.delay_message || ''} onChange={(e) => setFormData((p) => ({ ...p, delay_message: e.target.value }))} />
        <Text className="text-xs text-ui-fg-muted mt-1">Message to show when delay is applied</Text>
      </div>

      <div>
        <Label htmlFor="reason" className="text-sm font-medium">Reason (JSON)</Label>
        <Input placeholder='{"key": "value"} or leave empty for null' value={formData.reason ? JSON.stringify(formData.reason) : ''} onChange={(e) => {
          const value = e.target.value.trim();
          if (!value) { setFormData((p) => ({ ...p, reason: null })); return; }
          try { setFormData((p) => ({ ...p, reason: JSON.parse(value) })); } catch { setFormData((p) => ({ ...p, reason: null })); }
        }} />
        <Text className="text-xs text-ui-fg-muted mt-1">Optional JSON object for additional control metadata</Text>
      </div>

      <div>
        <Label className="text-sm font-medium">Message Icon</Label>
        <Text className="text-xs text-ui-fg-muted mt-1">PNG/JPEG/SVG. This will be uploaded and stored.</Text>
        <div className="mt-2">
          <FileUpload label="Click or drag to upload message icon" formats={["image/png", "image/jpeg", "image/svg+xml"]} multiple={false} includeBase64={true} onUploaded={(files: FileType[]) => setMessageIconFiles(files)} />
        </div>
        {mode === 'edit' && existingIconUrl ? (
          <div className="mt-2">
            <a href={existingIconUrl} target="_blank" rel="noopener noreferrer" className="text-ui-fg-interactive hover:underline text-sm">Open current icon in new tab</a>
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" disabled={!!submitting}>{submitting ? (mode === 'edit' ? 'Updating...' : 'Creating...') : (mode === 'edit' ? 'Update Control' : 'Create Control')}</Button>
      </div>
    </form>
  );
}
