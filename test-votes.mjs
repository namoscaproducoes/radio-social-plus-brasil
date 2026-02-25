import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  user: 'root',
  password: process.env.DATABASE_URL?.split(':')[1]?.split('@')[0] || '',
  database: 'radio_social_plus',
});

// Verificar tabelas
console.log('=== Tabelas ===');
const tables = await connection.execute('SHOW TABLES');
console.log(tables[0]);

// Verificar dados
console.log('\n=== Músicas ===');
const songs = await connection.execute('SELECT * FROM songs LIMIT 5');
console.log(songs[0]);

console.log('\n=== Votos ===');
const votes = await connection.execute('SELECT * FROM votes LIMIT 10');
console.log(votes[0]);

console.log('\n=== Query de Ranking ===');
const ranking = await connection.execute(`
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
console.log(ranking[0]);

connection.end();
