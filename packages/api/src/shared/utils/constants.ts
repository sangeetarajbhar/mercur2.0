// in seconds & must be in number
const rawTTL = process.env.WORKFLOW_RETENTION_TIME;
const ttl = rawTTL !== undefined ? Number(rawTTL) : NaN;

// default 3 days, in seconds
export const defaultRetentionTime = Number.isFinite(ttl) ? ttl : 259200;
