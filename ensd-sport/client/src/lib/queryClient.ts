import { QueryClient, QueryFunction } from "@tanstack/react-query";

let telegramIdStore: string | null = null;

export function setTelegramId(id: string | null) {
  telegramIdStore = id;
}

export function getTelegramId(): string | null {
  return telegramIdStore;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const telegramId = getTelegramId();
  const payload = data ? { ...data as object, telegramId } : undefined;
  
  const urlWithParams = telegramId && method === "GET" 
    ? `${url}${url.includes("?") ? "&" : "?"}telegramId=${telegramId}`
    : url;

  const res = await fetch(urlWithParams, {
    method,
    headers: payload ? { "Content-Type": "application/json" } : {},
    body: payload ? JSON.stringify(payload) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const telegramId = getTelegramId();
    let url = queryKey[0] as string;
    
    if (queryKey.length > 1 && queryKey[1]) {
      url = `${url}/${queryKey[1]}`;
    }
    
    if (telegramId) {
      url = `${url}${url.includes("?") ? "&" : "?"}telegramId=${telegramId}`;
    }

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
