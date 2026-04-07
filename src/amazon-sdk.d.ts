declare module "@amzn/creatorsapi-nodejs-sdk" {
  export class ApiClient {
    credentialId: string | null;
    credentialSecret: string | null;
    version: string | null;
  }
  export class DefaultApi {
    constructor(apiClient: ApiClient);
    searchItems(marketplace: string, opts: Record<string, unknown>): Promise<unknown>;
    getItems(marketplace: string, request: unknown): Promise<unknown>;
    getVariations(marketplace: string, request: unknown): Promise<unknown>;
  }
  export class SearchItemsRequestContent {
    [key: string]: unknown;
  }
  export class GetItemsRequestContent {
    constructor(partnerTag: string, itemIds: string[]);
    [key: string]: unknown;
  }
  export class GetVariationsRequestContent {
    [key: string]: unknown;
  }
}
