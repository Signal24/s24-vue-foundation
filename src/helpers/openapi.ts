import { configureOpenApiClient, type OpenApiClient, type OpenApiClientOptions, OpenApiError } from '@signal24/openapi-client-codegen/browser';

import { UserError } from '.';

export function configureVfOpenApiClient(client: OpenApiClient, clientOptions: OpenApiClientOptions) {
    configureOpenApiClient(client, {
        ...clientOptions,

        onError(err, options) {
            if (
                err instanceof OpenApiError &&
                err.response.status === 422 &&
                typeof err.body === 'object' &&
                err.body &&
                'error' in err.body &&
                typeof err.body.error === 'string'
            ) {
                err = new UserError(err.body.error);
            }

            const onErrResult = clientOptions.onError?.(err, options);
            if (onErrResult !== undefined) {
                return onErrResult;
            }

            return err;
        }
    });
}
