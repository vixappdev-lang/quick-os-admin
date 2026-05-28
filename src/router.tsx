import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { reportSupabaseError } from "@/lib/schema-errors";

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (err) => reportSupabaseError(err) }),
    mutationCache: new MutationCache({ onError: (err) => reportSupabaseError(err) }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPreload: "intent",
  });

  return router;
};
