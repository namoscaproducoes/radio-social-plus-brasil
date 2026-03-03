SELECT 
  s.id,
  s.title,
  s.artist,
  s.albumCover,
  s.duration,
  (COALESCE(SUM(CASE WHEN v.voteType = 'like' THEN 1 ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN uv.voteType = 'like' THEN 1 ELSE 0 END), 0)) as likes,
  (COALESCE(SUM(CASE WHEN v.voteType = 'dislike' THEN 1 ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN uv.voteType = 'dislike' THEN 1 ELSE 0 END), 0)) as dislikes,
  (COALESCE(COUNT(DISTINCT v.id), 0) + COALESCE(COUNT(DISTINCT uv.id), 0)) as totalVotes
FROM songs s
LEFT JOIN votes v ON s.id = v.songId
LEFT JOIN userVotes uv ON s.id = uv.songId
GROUP BY s.id
HAVING totalVotes > 0
ORDER BY totalVotes DESC;
