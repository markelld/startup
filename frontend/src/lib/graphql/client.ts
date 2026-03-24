import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'

const TOKEN_KEY = 'zone_token'
const ACCOUNT_KEY = 'zone_account_id'

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:3001/graphql',
})

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem(TOKEN_KEY)
  const accountId = localStorage.getItem(ACCOUNT_KEY)
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      ...(accountId ? { 'X-Account-ID': accountId } : {}),
    },
  }
})

const wsLink = new GraphQLWsLink(
  createClient({
    url: import.meta.env.VITE_WS_URL || 'ws://localhost:3001/cable',
    connectionParams: () => {
      const token = localStorage.getItem(TOKEN_KEY)
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
  })
)

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  wsLink,
  authLink.concat(httpLink)
)

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      TradingSession: {
        fields: {
          trades: { merge: false },
        },
      },
    },
  }),
})
