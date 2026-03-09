import mysql from 'mysql2/promise';
import https from 'https';

// Função para buscar capa no iTunes
async function searchItunesAlbumCover(artist, title) {
  return new Promise((resolve) => {
    const query = encodeURIComponent(`${artist} ${title}`);
    const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            const artwork = json.results[0].artworkUrl600 || json.results[0].artworkUrl100;
            resolve(artwork || null);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function updateAlbumCovers() {
  try {
    const connection = await pool.getConnection();
    
    // Buscar músicas sem capa (null ou string vazia)
    const [songs] = await connection.query(
      'SELECT id, title, artist FROM songs WHERE albumCover IS NULL OR albumCover = "" LIMIT 50'
    );
    
    console.log(`Encontradas ${songs.length} músicas sem capa`);
    
    for (const song of songs) {
      try {
        console.log(`Buscando capa para: ${song.artist} - ${song.title}`);
        const cover = await searchItunesAlbumCover(song.artist, song.title);
        
        if (cover) {
          await connection.query(
            'UPDATE songs SET albumCover = ? WHERE id = ?',
            [cover, song.id]
          );
          console.log(`✓ Atualizado: ${song.title}`);
        } else {
          console.log(`✗ Capa não encontrada: ${song.title}`);
        }
      } catch (error) {
        console.error(`Erro ao processar ${song.title}:`, error.message);
      }
      
      // Aguardar 500ms entre requisições para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    connection.release();
    console.log('Atualização concluída!');
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

updateAlbumCovers();
