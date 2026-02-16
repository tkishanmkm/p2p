This file is intentionally left blank to resolve a routing conflict.
The primary user profile page is located at /src/app/users/[username]/page.tsx.
By not exporting a default component, Next.js will not create a page route from this file,
which solves the "different slug names for the same dynamic path" error.
