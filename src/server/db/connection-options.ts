import "server-only";

export const POSTGRES_CONNECTION_OPTIONS = {
  prepare: false,
  max: 5,
  connect_timeout: 10,
  idle_timeout: 60,
  // Allow one in-flight query per connection. Zero bypasses Postgres.js's
  // onexecute callback and breaks transaction connection reservation.
  max_pipeline: 1,
};

// Read queries serialize reliably with zero through this pooler, but transactions
// need onexecute to reserve their connection. Keep them on separate pools.
export const POSTGRES_READ_CONNECTION_OPTIONS = {
  ...POSTGRES_CONNECTION_OPTIONS,
  max_pipeline: 0,
};

export const POSTGRES_WRITE_CONNECTION_OPTIONS = {
  ...POSTGRES_CONNECTION_OPTIONS,
  max: 2,
};
