import { api } from "./api";
import type { AttemptParameters, CatalogResponse, CreateManualOrder, ManualAuditEvent, ManualOrder, ManualOrderList, ManualPreview } from "@/types/manualOrders";

const base = (channel: string) => `/api/v1/broadcasters/${encodeURIComponent(channel)}/manual-orders`;
export const manualOrdersApi = {
  catalog: (channel: string, search: string, offset = 0) => api.get<CatalogResponse>(`${base(channel)}/catalog`, { params: { search, offset, limit: 24 } }).then(r => r.data),
  preview: (channel: string, body: { item_name: string; currency?: string; max_price?: number; chance_to_transfer?: number; trade_link?: string }) => api.post<ManualPreview>(`${base(channel)}/preview`, body).then(r => r.data),
  list: (channel: string, params: { search?: string; status?: string; tag?: string; offset?: number; limit?: number }) => api.get<ManualOrderList>(base(channel), { params }).then(r => r.data),
  detail: (channel: string, id: string) => api.get<ManualOrder>(`${base(channel)}/${encodeURIComponent(id)}`).then(r => r.data),
  audit: (channel: string, id: string) => api.get<ManualAuditEvent[]>(`${base(channel)}/${encodeURIComponent(id)}/audit`).then(r => r.data),
  create: (channel: string, body: CreateManualOrder) => api.post<ManualOrder>(base(channel), body).then(r => r.data),
  retry: (channel: string, id: string, body: AttemptParameters) => api.post<ManualOrder>(`${base(channel)}/${encodeURIComponent(id)}/retry`, body).then(r => r.data),
  metadata: (channel: string, id: string, body: { description: string; tags: string[] }) => api.patch<ManualOrder>(`${base(channel)}/${encodeURIComponent(id)}`, body).then(r => r.data),
  close: (channel: string, id: string, reason: string) => api.post<ManualOrder>(`${base(channel)}/${encodeURIComponent(id)}/close`, { reason }).then(r => r.data),
};
