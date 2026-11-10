export type HealthResponse = {
  status: "ok";
  db: "up" | "down";
  uptimeSeconds: number;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
};
