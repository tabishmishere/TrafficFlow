export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Project {
  projectId: string;
  name: string;
  description: string | null;
  targetApiUrl: string;
  healthEndpoint: string | null;
  rateLimit: {
    requests: number;
    windowSeconds: number;
  };
  gatewayUrl: string;
}

export interface RequestLog {
  requestId: string;
  projectId: string;
  method: RequestMethod;
  path: string;
  statusCode: number;
  latencyMs: number;
  createdAt: string;
}

export interface HealthCheck {
  status: "HEALTHY" | "UNHEALTHY";
  responseMs: number | null;
  statusCode: number | null;
  checkedAt: string;
}

export const projects: Project[] = [
  {
    projectId: "proj_demo_payments",
    name: "Payments API",
    description: "Payment processing and billing services.",
    targetApiUrl: "https://api.payments.example.com",
    healthEndpoint: "https://api.payments.example.com/health",
    rateLimit: { requests: 100, windowSeconds: 60 },
    gatewayUrl: "http://localhost:4000/g/proj_demo_payments",
  },
  {
    projectId: "proj_demo_storefront",
    name: "Storefront API",
    description: "Product catalog, cart, and checkout endpoints.",
    targetApiUrl: "https://api.storefront.example.com",
    healthEndpoint: "https://api.storefront.example.com/health",
    rateLimit: { requests: 100, windowSeconds: 60 },
    gatewayUrl: "http://localhost:4000/g/proj_demo_storefront",
  },
  {
    projectId: "proj_demo_users",
    name: "User Service",
    description: "Identity, profiles, and account preferences.",
    targetApiUrl: "https://users.internal.example.com",
    healthEndpoint: null,
    rateLimit: { requests: 100, windowSeconds: 60 },
    gatewayUrl: "http://localhost:4000/g/proj_demo_users",
  },
];

export const requests: RequestLog[] = [
  { requestId: "req_demo_01", projectId: "proj_demo_payments", method: "POST", path: "/v1/charges", statusCode: 201, latencyMs: 86, createdAt: "2026-10-19T12:24:38.000Z" },
  { requestId: "req_demo_02", projectId: "proj_demo_payments", method: "GET", path: "/v1/customers/cus_92f", statusCode: 200, latencyMs: 42, createdAt: "2026-10-19T12:24:12.000Z" },
  { requestId: "req_demo_03", projectId: "proj_demo_storefront", method: "GET", path: "/v2/products", statusCode: 200, latencyMs: 71, createdAt: "2026-10-19T12:23:56.000Z" },
  { requestId: "req_demo_04", projectId: "proj_demo_payments", method: "POST", path: "/v1/refunds", statusCode: 502, latencyMs: 506, createdAt: "2026-10-19T12:23:41.000Z" },
  { requestId: "req_demo_05", projectId: "proj_demo_users", method: "PATCH", path: "/v1/users/usr_4c1", statusCode: 200, latencyMs: 214, createdAt: "2026-10-19T12:23:18.000Z" },
  { requestId: "req_demo_06", projectId: "proj_demo_storefront", method: "GET", path: "/v2/cart", statusCode: 200, latencyMs: 93, createdAt: "2026-10-19T12:22:59.000Z" },
  { requestId: "req_demo_07", projectId: "proj_demo_payments", method: "DELETE", path: "/v1/payment-methods/pm_18a", statusCode: 204, latencyMs: 64, createdAt: "2026-10-19T12:22:32.000Z" },
  { requestId: "req_demo_08", projectId: "proj_demo_users", method: "GET", path: "/v1/users/usr_4c1", statusCode: 429, latencyMs: 12, createdAt: "2026-10-19T12:21:48.000Z" },
  { requestId: "req_demo_09", projectId: "proj_demo_storefront", method: "PUT", path: "/v2/cart/itm_33", statusCode: 200, latencyMs: 121, createdAt: "2026-10-19T12:20:19.000Z" },
  { requestId: "req_demo_10", projectId: "proj_demo_payments", method: "GET", path: "/v1/invoices", statusCode: 200, latencyMs: 57, createdAt: "2026-10-19T12:19:06.000Z" },
  { requestId: "req_demo_11", projectId: "proj_demo_payments", method: "POST", path: "/v1/charges", statusCode: 201, latencyMs: 91, createdAt: "2026-10-19T12:18:41.000Z" },
  { requestId: "req_demo_12", projectId: "proj_demo_storefront", method: "GET", path: "/v2/products/sku_192", statusCode: 200, latencyMs: 65, createdAt: "2026-10-19T12:17:23.000Z" },
];

export const dashboardStats = [
  { label: "Requests today", value: "12,486", foot: "Across all projects", tone: "", icon: "activity" },
  { label: "Successful requests", value: "12,000", foot: "2xx and 3xx responses", tone: "positive", icon: "check" },
  { label: "Failed requests", value: "486", foot: "4xx and 5xx responses", tone: "", icon: "alert" },
  { label: "Average latency", value: "94 ms", foot: "Today · all projects", tone: "", icon: "clock" },
  { label: "API health", value: "2 healthy", foot: "1 unknown · 0 unhealthy", tone: "positive", icon: "heart" },
];

export const topEndpoints = [
  { path: "/v1/charges", requests: 3642 },
  { path: "/v2/products", requests: 2981 },
  { path: "/v1/customers", requests: 1744 },
  { path: "/v1/users", requests: 963 },
];

export const statusDistribution = [
  { statusCode: 200, requests: 9000 },
  { statusCode: 201, requests: 2600 },
  { statusCode: 204, requests: 400 },
  { statusCode: 400, requests: 300 },
  { statusCode: 429, requests: 90 },
  { statusCode: 500, requests: 30 },
  { statusCode: 502, requests: 66 },
];

export const latestHealthChecks: Record<string, HealthCheck | null> = {
  proj_demo_payments: {
    status: "HEALTHY",
    responseMs: 42,
    statusCode: 200,
    checkedAt: "2026-10-19T12:22:00.000Z",
  },
  proj_demo_storefront: {
    status: "HEALTHY",
    responseMs: 67,
    statusCode: 200,
    checkedAt: "2026-10-19T12:20:00.000Z",
  },
  proj_demo_users: null,
};

export function getProject(projectId: string): Project | undefined {
  return projects.find((project) => project.projectId === projectId);
}

export function getProjectRequests(projectId: string): RequestLog[] {
  return requests.filter((request) => request.projectId === projectId);
}
