Welcome to your new TanStack app! 

# Getting Started

To run this application:

```bash
npm install
npm run dev
```

# Building For Production

To build this application for production:

```bash
npm run build
```

## Deploying to Vercel

The build uses the `nitro` Vite plugin, which produces Vercel's output format automatically.
Set these environment variables in the Vercel project (see `.env.example`):

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (the deployed URL, not localhost)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `BLOB_READ_WRITE_TOKEN` (added automatically when a Vercel Blob store is connected to the project)

Also add `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI for
the Google OAuth client. `prisma generate` runs automatically on install.
Keep the `http://localhost:3000/api/auth/callback/google` URI too so local development keeps working.

## Local database and environments

There are two complete environment files, both git-ignored, and every command picks one **explicitly**:

| File | Database | Used by |
|---|---|---|
| `.env.dev` | PostgreSQL on this machine (`matbingo_dev`) | `npm run dev`, `db:push`, `db:studio`, `db:seed`, `db:reset`, `prisma`, `script` |
| `.env.prod` | the real production database (real data!) | `npm run dev:prod`, `db:push:prod`, `db:studio:prod`, `prisma:prod`, `script:prod` |

Each file holds all settings (`DATABASE_URL`, `BETTER_AUTH_*`, `GOOGLE_*`). `scripts/with-env.mjs` loads exactly one of
them for the command it runs and prints which database is in play first. The safety rules:

- `.env.dev` must point at a database on localhost, and `.env.prod` must not; otherwise the launcher refuses to run.
- Everything that can change production (`db:push:prod`, `db:studio:prod`, `prisma:prod`, `script:prod`) asks for
  confirmation: type `prod` when asked, or set `CONFIRM_PRODUCTION=1` in non-interactive use. `dev:prod` only prints a warning.
- There is no plain `.env` on purpose. A command started without the launcher (e.g. `npx prisma db push`) finds no
  database and fails, instead of silently using the wrong one.

```bash
npm run dev                  # dev server against the local database
npm run dev:prod             # dev server against PRODUCTION (be careful)

npm run db:push              # create/update the tables in the local database
npm run db:push:prod         # the same in production (asks first). New tables must exist before code that uses them is deployed
npm run prisma -- migrate diff ...      # any Prisma command; add :prod for production
npm run script -- scripts/x.ts --flag   # run a script in scripts/; script:prod for production
```

One-time setup of the local database (PostgreSQL installed and running):

```bash
psql -U postgres -c "CREATE ROLE matbingo WITH LOGIN PASSWORD 'matbingo';"
psql -U postgres -c "CREATE DATABASE matbingo_dev OWNER matbingo;"
npm run db:push     # create the tables
npm run db:seed     # test family, 16 recipes (photos, steps, hibernation), a planned week
```

Create `.env.dev` and `.env.prod` from `.env.example` (the same settings in both, with the matching `DATABASE_URL`).

- `npm run db:reset` deletes the test family and creates it again. `db:seed` is safe to re-run and refuses to run
  against a database that isn't on localhost.
- Log in locally with Google (the local database starts without users), then either join the test family in
  Settings with the code `TESTFAM1`, or run `npm run db:seed -- --attach you@gmail.com` to become its admin.
- Restart the dev server after changing an env file. Vercel has its own settings.

## Blueprint library and the super admin

The shared recipe library (`/recipes/library`) is stored in the database (`Blueprint`, `BlueprintStep`,
`BlueprintImage`). The first time it is read while empty, it is filled from `src/data/blueprint-recipes.ts`;
after that the database is the source of truth and that file is not used.

Only the super admin, `saiboten@gmail.com` (verified Google email), can edit it, at `/admin/blueprints`. The
link only appears for that user, and every admin API call is checked again on the server. To use other
addresses, set `SUPER_ADMIN_EMAILS` (comma separated) on the server. The link in the interface always follows
the built-in default in `src/lib/super-admin.ts`.

New tables must exist in a database before code that uses them is deployed: run `npm run db:push` for the
local database, and `npm run db:push:prod` for production (deliberately, before the deploy).

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
npm run test
```

## Styling

This project uses CSS for styling.




## Routing
This project uses [TanStack Router](https://tanstack.com/router). The initial setup is a file based router. Which means that the routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add another a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you use the `<Outlet />` component.

Here is an example layout that includes a header:

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { Link } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <>
      <header>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})
```

The `<TanStackRouterDevtools />` component is not required so you can remove it if you don't want it in your layout.

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).


## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
const peopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/people",
  loader: async () => {
    const response = await fetch("https://swapi.dev/api/people");
    return response.json() as Promise<{
      results: {
        name: string;
      }[];
    }>;
  },
  component: () => {
    const data = peopleRoute.useLoaderData();
    return (
      <ul>
        {data.results.map((person) => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    );
  },
});
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

### React-Query

React-Query is an excellent addition or alternative to route loading and integrating it into you application is a breeze.

First add your dependencies:

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

Next we'll need to create a query client and provider. We recommend putting those in `main.tsx`.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ...

const queryClient = new QueryClient();

// ...

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

You can also add TanStack Query Devtools to the root route (optional).

```tsx
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools />
    </>
  ),
});
```

Now you can use `useQuery` to fetch your data.

```tsx
import { useQuery } from "@tanstack/react-query";

import "./App.css";

function App() {
  const { data } = useQuery({
    queryKey: ["people"],
    queryFn: () =>
      fetch("https://swapi.dev/api/people")
        .then((res) => res.json())
        .then((data) => data.results as { name: string }[]),
    initialData: [],
  });

  return (
    <div>
      <ul>
        {data.map((person) => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

You can find out everything you need to know on how to use React-Query in the [React-Query documentation](https://tanstack.com/query/latest/docs/framework/react/overview).

## State Management

Another common requirement for React applications is state management. There are many options for state management in React. TanStack Store provides a great starting point for your project.

First you need to add TanStack Store as a dependency:

```bash
npm install @tanstack/store
```

Now let's create a simple counter in the `src/App.tsx` file as a demonstration.

```tsx
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import "./App.css";

const countStore = new Store(0);

function App() {
  const count = useStore(countStore);
  return (
    <div>
      <button onClick={() => countStore.setState((n) => n + 1)}>
        Increment - {count}
      </button>
    </div>
  );
}

export default App;
```

One of the many nice features of TanStack Store is the ability to derive state from other state. That derived state will update when the base state updates.

Let's check this out by doubling the count using derived state.

```tsx
import { useStore } from "@tanstack/react-store";
import { Store, Derived } from "@tanstack/store";
import "./App.css";

const countStore = new Store(0);

const doubledStore = new Derived({
  fn: () => countStore.state * 2,
  deps: [countStore],
});
doubledStore.mount();

function App() {
  const count = useStore(countStore);
  const doubledCount = useStore(doubledStore);

  return (
    <div>
      <button onClick={() => countStore.setState((n) => n + 1)}>
        Increment - {count}
      </button>
      <div>Doubled - {doubledCount}</div>
    </div>
  );
}

export default App;
```

We use the `Derived` class to create a new store that is derived from another store. The `Derived` class has a `mount` method that will start the derived store updating.

Once we've created the derived store we can use it in the `App` component just like we would any other store using the `useStore` hook.

You can find out everything you need to know on how to use TanStack Store in the [TanStack Store documentation](https://tanstack.com/store/latest).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

## Photos (Vercel Blob)

Recipe and blueprint photos are uploaded to a public Vercel Blob store and served from Vercel's CDN; a recipe or
blueprint only stores the link (`imageUrl`). Uploading needs `BLOB_READ_WRITE_TOKEN` (in `.env.dev` / `.env.prod` and in Vercel).

Photos that were saved as base64 in the database before are moved with
`npm run script -- scripts/migrate-images-to-blob.ts [--dry-run]` (`script:prod` for production). It is safe to run again,
and it leaves the old base64 rows in place. Until those rows are dropped, a photo without a link is still served from the
old `/api/recipe-image` and `/api/blueprint-image` endpoints.
