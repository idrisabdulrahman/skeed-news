import { redirect } from "next/navigation";

// /news is the legacy all-news index. The canonical "all news" page is
// /category/news (the masthead's News chip, the footer, and the landing page's
// "More news" button all link there) — it paginates the full analyzed set.
// Redirect so existing links and Clerk's fallback redirect URLs still resolve.
export default function NewsIndexPage() {
  redirect("/category/news");
}