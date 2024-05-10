import { CodegenConfig } from '@graphql-codegen/cli'

const endpoint = process.env.GRAPHQL_ENDPOINT || 'http://localhost:8080/v1/graphql'

const config: CodegenConfig = {
  schema: [
    {
      [endpoint]: {
        headers: {
          'x-hasura-admin-secret': process.env.HASURA_GRAPHQL_ADMIN_SECRET!,
        }
      },
    },
  ],
  documents: [
    'app/**/*.graphql',
  ],
  ignoreNoDocuments: true, // for better experience with the watcher
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