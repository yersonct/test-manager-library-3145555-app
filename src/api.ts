export type Role = "admin" | "librarian";

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: Category;
  total_copies: number;
  available_copies: number;
  cover_key: string | null;
}

export interface Member {
  id: string;
  full_name: string;
  document_number: string;
  active_loans?: number;
}

export interface LoanItem {
  id: string;
  book_id: string;
  book_title: string;
  isbn: string;
  category_name: string;
  due_at: string;
  returned_at: string | null;
}

export interface Loan {
  id: string;
  member_id: string;
  member_name: string;
  loaned_at: string;
  status: "open" | "overdue" | "closed";
  items: LoanItem[];
}

export interface OverdueItem {
  loan_id: string;
  item_id: string;
  book_title: string;
  member_name: string;
  due_at: string;
  days_late: number;
}

export interface ReportRow {
  book_id: string;
  book_title: string;
  category_name: string;
  times_borrowed: number;
}

interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: Array<{ field: string; issue: string }>;
}

const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  token?: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Verifique que la API esté disponible.", 0);
  }

  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as ApiErrorBody | T | null;
  if (!response.ok) {
    const error = body as ApiErrorBody | null;
    throw new ApiError(error?.message || "No se pudo completar la operación.", response.status, error?.code);
  }
  return body as T;
}

export async function apiRequestBlob(path: string, token: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      headers: { Accept: "image/*", Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Verifique que la API esté disponible.", 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body?.message || "No se pudo cargar la portada.", response.status, body?.code);
  }
  return response.blob();
}

export const jsonBody = (value: unknown): string => JSON.stringify(value);
