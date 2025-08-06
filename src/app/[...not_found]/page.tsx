import { notFound } from 'next/navigation'
 
// This is a catch-all route that will match any path that is not explicitly defined.
export default function NotFoundCatchAll() {
  // For any other path, render the standard 404 page.
  notFound()
}
