import { BuildStats, BuildStatus } from "./builds";
import { TaskStatus } from "./tasks";

export type ServiceHealthStatus = "healthy" | "unhealthy" | "unknown";

export type HealthEndpointStatus = {
  status: number;
  responseTime: number;
};

export type HealthBuildStatus = {
  id: string;
  status: BuildStatus;
  duration: number;
};

export type HealthRepoBuildStatus = {
  id: string;
  status: BuildStatus;
  duration: number;
};

export type HealthTaskStatus = {
  id: string;
  status: TaskStatus;
  duration: number;
};

export type ServiceHealthDetails = {
  responseTime: number;
  error?: string;
  endpoints?: Record<string, HealthEndpointStatus>;
  buildStatus?: HealthBuildStatus;
  repoBuildStatus?: HealthRepoBuildStatus;
  taskStatus?: HealthTaskStatus;
};

export type ServiceHealthResponse = {
  service: string;
  status: ServiceHealthStatus;
  timestamp: string;
  details: ServiceHealthDetails;
};

export type HealthResponse = {
  timestamp: string;
  services: ServiceHealthResponse[];
};
