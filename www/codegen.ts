import { CodegenConfig } from '@graphql-codegen/cli'

const endpoint = process.env.GRAPHQL_API_URL || 'http://localhost:8080/v1/graphql'
const hasuraAdminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET
if (!hasuraAdminSecret) {
  throw new Error('HASURA_GRAPHQL_ADMIN_SECRET is required')
}

const config: CodegenConfig = {
  schema: [
    {
      [endpoint]: {
        headers: {
          'x-hasura-admin-secret': hasuraAdminSecret
        }
      },
    },
  ],
  documents: [
    'app/**/*.graphql',
  ],
  ignoreNoDocuments: false,
  generates: {
    './app/graphql/_generated.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-graphql-request',
      ],
    },
  }
}

export default config
