import { Button } from "@linguamaxima/ui/components/button";
import {
  Link,
  createRouter as createTanStackRouter,
} from "@tanstack/react-router";
import { AlertTriangle, Compass, Home } from "lucide-react";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";

function RouterNotFound() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-20 text-center space-y-5">
      <div className="mx-auto size-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-sky-400">
        <Compass className="size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          404 — Page Not Found
        </h1>
        <p className="text-sm text-neutral-400">
          The page or story you requested does not exist or has moved.
        </p>
      </div>
      <Link to="/" className="inline-flex">
        <Button className="gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold">
          <Home className="size-4" />
          Back to Stories
        </Button>
      </Link>
    </div>
  );
}

function RouterError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-20 text-center space-y-5">
      <div className="mx-auto size-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
        <AlertTriangle className="size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Something went wrong
        </h1>
        <p className="text-sm text-neutral-400">{error.message}</p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
        <Link to="/" className="inline-flex">
          <Button className="gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold">
            <Home className="size-4" />
            Back to Stories
          </Button>
        </Link>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const router = createTanStackRouter({
    context: {},
    defaultErrorComponent: RouterError,
    defaultNotFoundComponent: RouterNotFound,
    defaultPendingComponent: () => <Loader />,
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
  });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
