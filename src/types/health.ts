import { BuildStatus } from "./builds";
import { TaskStatus } from "./tasks";

export type ServiceHealthStatus = "healthy" | "unhealthy" | "degraded" | "unknown";

export type HealthEndpointStatus = {
	/** HTTP status code the probe got from the endpoint. */
	Status: number;
	/** In milliseconds. */
	ResponseTime: number;
};

export type HealthBuildStatus = {
	ID: string;
	Status: BuildStatus;
	/** In milliseconds. */
	Duration: number;
};

export type HealthRepoBuildStatus = HealthBuildStatus;

export type HealthTaskStatus = {
	ID: string;
	Status: TaskStatus;
	/** In milliseconds. */
	Duration: number;
};

export type ServiceHealthDetails = {
	/** In milliseconds. */
	ResponseTime: number;
	Error?: string;
	Endpoints?: Record<string, HealthEndpointStatus>;
	BuildStatus?: HealthBuildStatus;
	RepoBuildStatus?: HealthRepoBuildStatus;
	TaskStatus?: HealthTaskStatus;
};

export type ServiceHealthResponse = {
	Service: string;
	Status: ServiceHealthStatus;
	Timestamp: string;
	Details: ServiceHealthDetails;
};

export type HealthResponse = {
	Timestamp: string;
	Services: ServiceHealthResponse[];
};
