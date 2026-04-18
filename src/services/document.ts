// src/services/document.ts
import request from '@/utils/request';

export async function getDocuments() {
  return request('/documents');
}
export async function getDocumentsDetail(id: number) {
  return request(`/documents/${id}`);
}

export async function createDocument(data: { content: string }) {
  return request('/documents', { method: 'POST', data });
}

export async function updateDocument(id: number, data: { content: string }) {
  return request(`/documents/${id}`, { method: 'PUT', data });
}

export async function deleteDocument(id: number) {
  return request(`/documents/${id}`, { method: 'DELETE' });
}
