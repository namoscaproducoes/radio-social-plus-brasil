import { getDb } from './server/db.ts';

const db = await getDb();
if (!db) {
  console.log('Database not available');
  process.exit(1);
}

console.log('=== Testando query de votos ===');
const result = await db.execute(`
  SELECT 
    s.id,
    s.title,
    s.artist,
    COUNT(CASE WHEN v.voteType = 'like' THEN 1 END) as likes,
    COUNT(CASE WHEN v.voteType = 'dislike' THEN 1 END) as dislikes,
    COUNT(v.id) as totalVotes
  FROM songs s
  LEFT JOIN votes v ON s.id = v.songId
  GROUP BY s.id
  ORDER BY totalVotes DESC
  LIMIT 10
`);

console.log('Tipo de result:', typeof result);
console.log('Result é array?', Array.isArray(result));
console.log('Result:', JSON.stringify(result, null, 2));

if (Array.isArray(result) && result.length > 0) {
  console.log('Primeiro item:', result[0]);
}

process.exit(0);
