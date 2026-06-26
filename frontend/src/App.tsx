// App.tsx is the ROOT COMPONENT — the top of the React component tree.
// Every other component will be a descendant of this one.
//
// WHAT PROVIDERS DO:
// React "Providers" use the Context API to make data available
// to ALL descendant components without passing props down manually.
// This pattern is called "prop drilling avoidance".
//
// The order of providers matters — outer providers can be accessed
// by inner providers. Think of them as nested scopes.

import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import AppRoutes from './routes/AppRoutes'

// QueryClient is the brain of React Query.
// It manages the cache, background refetching, and deduplication of requests.
// We create ONE instance at the root and share it via QueryClientProvider.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered "fresh" (no refetch needed): 5 minutes.
      // If you visit the same page within 5 minutes, React Query serves
      // cached data instantly — no loading spinner.
      staleTime: 1000 * 60 * 5,

      // How long inactive (unmounted) query data stays in memory: 10 minutes.
      // After this, it's garbage collected.
      gcTime: 1000 * 60 * 10,

      // Don't retry on 401 (Unauthorized) or 403 (Forbidden).
      // No point retrying auth errors — they won't fix themselves.
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false
        }
        return failureCount < 2  // Retry other errors up to 2 times
      },
    },
  },
})

function App() {
  return (
    // BrowserRouter uses the HTML5 History API (pushState, replaceState).
    // It reads the URL from window.location and makes it available
    // to all Route components inside it.
    // This is what makes /map, /login, /profile work as separate "pages"
    // without ever actually reloading from the server.
    <BrowserRouter>

      {/* QueryClientProvider injects the queryClient into React's context.
          Any component inside can now call: useQuery(), useMutation(), etc.
          Without this wrapper, those hooks would throw an error. */}
      <QueryClientProvider client={queryClient}>

        {/* AppRoutes contains all our <Route> definitions.
            React Router reads the current URL and renders the matching component. */}
        <AppRoutes />

        {/* ReactQueryDevtools shows a floating panel in development ONLY.
            It shows: all active queries, their cache status, their data.
            This panel is automatically excluded from production builds. */}
        <ReactQueryDevtools initialIsOpen={false} />

      </QueryClientProvider>
    </BrowserRouter>
  )
}

export default App
