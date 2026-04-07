import { z } from "zod";

const configSchema = z.object({
  credentialId: z.string().min(1),
  credentialSecret: z.string().min(1),
  credentialVersion: z.string().min(1),
  associateTag: z.string().min(1),
  marketplace: z.string().default("www.amazon.com"),
  cacheTtlSearch: z.coerce.number().int().positive().default(3600),
  cacheTtlDetails: z.coerce.number().int().positive().default(86400),
  cacheTtlVariations: z.coerce.number().int().positive().default(86400),
  rateLimitTps: z.coerce.number().int().positive().default(1),
  rateLimitTpd: z.coerce.number().int().positive().default(8640),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  return configSchema.parse({
    credentialId: process.env.AMAZON_CREDENTIAL_ID,
    credentialSecret: process.env.AMAZON_CREDENTIAL_SECRET,
    credentialVersion: process.env.AMAZON_CREDENTIAL_VERSION,
    associateTag: process.env.AMAZON_ASSOCIATE_TAG,
    marketplace: process.env.AMAZON_MARKETPLACE,
    cacheTtlSearch: process.env.CACHE_TTL_SEARCH,
    cacheTtlDetails: process.env.CACHE_TTL_DETAILS,
    cacheTtlVariations: process.env.CACHE_TTL_VARIATIONS,
    rateLimitTps: process.env.RATE_LIMIT_TPS,
    rateLimitTpd: process.env.RATE_LIMIT_TPD,
  });
}
