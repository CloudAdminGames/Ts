import { SQL } from "bun";

const PORT = 3000;

const sql = new SQL("postgres://admin:password123@localhost:5432/inventory");

// All valid column names in the games table
const VALID_COLUMNS = [
  "id",
  "slug",
  "name",
  "released",
  "background_image",
  "rating",
  "rating_top",
  "ratings_count",
  "reviews_text_count",
  "added",
  "playtime",
  "suggestions_count",
  "updated",
  "reviews_count",
  "saturated_color",
  "dominant_color",
  "platforms",
  "stores",
  "developers",
  "genres",
  "tags",
  "publishers",
  "esrb_rating",
  "added_by_status",
  "metacritic_url",
  "ratings",
  "clip",
  "name_original",
  "reddit_url",
  "reactions",
  "parents_count",
  "background_image_additional",
  "website",
  "reddit_count",
  "youtube_count",
  "short_screenshots",
  "creators_count",
  "twitch_count",
  "metacritic_platforms",
  "screenshots_count",
  "parent_platforms",
  "description",
  "description_raw",
  "metacritic",
  "achievements_count",
  "alternative_names",
  "parent_achievements_count",
  "game_series_count",
  "additions_count",
  "movies_count",
  "reddit_name",
  "reddit_description",
  "reddit_logo",
  "tba",
] as const;

Bun.serve({
  port: PORT,
  routes: {
    "/health": {
      GET: () => {
        const start = performance.now();
        const response = new Response("OK", { status: 200 });
        const duration = performance.now() - start;
        console.log(`GET /health - ${duration.toFixed(2)}ms`);
        return response;
      },
    },
    "/api/games/search": {
      GET: async (req) => {
        const start = performance.now();
        const url = new URL(req.url);
        const column = url.searchParams.get("column");
        const searchQuery = url.searchParams.get("q");

        if (!searchQuery || searchQuery.trim() === "") {
          return Response.json(
            { error: "Missing search query parameter 'q'" },
            { status: 400 },
          );
        }

        // If a column is specified, search only that column
        if (column) {
          if (!VALID_COLUMNS.includes(column as any)) {
            return Response.json(
              {
                error: `Invalid column "${column}"`,
                valid_columns: VALID_COLUMNS,
              },
              { status: 400 },
            );
          }

          const queryText = `SELECT * FROM games WHERE "${column}"::text ILIKE $1 LIMIT 20`;
          const games = await sql.unsafe(queryText, [`%${searchQuery.trim()}%`]);
          const duration = performance.now() - start;
          console.log(
            `GET /api/games/search?column=${column}&q=${searchQuery} - ${duration.toFixed(2)}ms`,
          );
          return Response.json({
            data: games,
            meta: {
              count: games.length,
              duration_ms: parseFloat(duration.toFixed(2)),
              column,
              query: searchQuery,
            },
          });
        }

        // No column specified: search across all columns (original behavior)
        const searchTerms = searchQuery.trim().split(/\s+/);

        const conditions = searchTerms.map((_, index) => {
          return `games::text ILIKE $${index + 1}`;
        });

        const whereClause = conditions.join(" AND ");
        const queryText = `SELECT * FROM games WHERE ${whereClause} LIMIT 20`;

        const searchPatterns = searchTerms.map((term) => `%${term}%`);
        const games = await sql.unsafe(queryText, searchPatterns);
        const duration = performance.now() - start;
        console.log(
          `GET /api/games/search?q=${searchQuery} - ${duration.toFixed(2)}ms`,
        );
        return Response.json({
          data: games,
          meta: {
            count: games.length,
            duration_ms: parseFloat(duration.toFixed(2)),
            query: searchQuery,
          },
        });
      },
    },
  },
  development: {
    hmr: true,
  },
});

console.log(`Server is running on port ${PORT}`);
