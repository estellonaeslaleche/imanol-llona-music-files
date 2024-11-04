const fs = require('fs');
const path = require('path');
const mp3Duration = require('mp3-duration');

async function formatDuration(duration) {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Envuelve mp3Duration en una función que retorna una Promise
function getMp3Duration(filePath) {
  return new Promise((resolve, reject) => {
    mp3Duration(filePath, (err, duration) => {
      if (err) return reject(err);
      resolve(duration);
    });
  });
}

function createSlug(title) {
  return title
    .toLowerCase()                // Convierte a minúsculas
    .normalize("NFD")              // Normaliza para separar caracteres especiales
    .replace(/[\u0300-\u036f]/g, "") // Elimina los acentos
    .replace(/[^a-z0-9 ]/g, "")    // Elimina caracteres no alfanuméricos, excepto espacios
    .trim()                        // Elimina espacios iniciales y finales
    .replace(/\s+/g, "-");         // Reemplaza espacios por guiones
}

async function generateData() {
  const data = {
    playlists: [],
    songs: []
  };
  const rootDir = path.join(__dirname, 'albums');
  let songId = 1;
  let albumId = 1;

  const albums = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory());

  for (const album of albums) {
    const albumDir = path.join(rootDir, album.name);
    const albumData = {
      id: albumId.toString(),
      albumId,
      title: '',
      color: '', 
      cover: '',
      artists: ['Imanol Llona'],
      duration: '',
      releaseYear: '',
      releaseMonth: '',
      releaseDay: ''
    };

    let trackNames = [];

    const infoFilePath = path.join(albumDir, 'info.txt');
    if (fs.existsSync(infoFilePath)) {
      const fileContent = fs.readFileSync(infoFilePath, 'utf-8');
      const lines = fileContent.split('\n');
      for (const line of lines) {
        if (line.startsWith('Albumtitle:')) {
          albumData.title = line.replace('Albumtitle:', '').trim();
          albumData.id = createSlug(albumData.title)
        } else if (line.startsWith('Albumcover:')) {
          albumData.cover = line.replace('Albumcover:', '').trim();
        } else if (line.startsWith('ReleaseDate:')) {
          const [year, month, day] = line.replace('ReleaseDate:', '').trim().split('-');
          albumData.releaseYear = year;
          albumData.releaseMonth = month;
          albumData.releaseDay = day;
        } else if (line.startsWith('TrackNames:')) {
          trackNames = line.replace('TrackNames:', '').trim().split(',').map(name => name.trim());
        }
      }
    }

    const coverFilePath = path.join(albumDir, 'cover.jpg');
    if (!albumData.cover && fs.existsSync(coverFilePath)) {
      albumData.cover = `https://imanol-llona-music-files.pages.dev/albums/${album.name}/cover.jpg`;
    }

    let albumDuration = 0;
    const files = fs.readdirSync(albumDir);
    let trackIndex = 0;

    for (const file of files) {
      const filePath = path.join(albumDir, file);

      if (file.endsWith('.mp3')) {
        try {
          const duration = await getMp3Duration(filePath);
          albumDuration += duration;

          data.songs.push({
            id: songId,
            albumId,
            url: `https://imanol-llona-music-files.pages.dev/albums/${album.name}/${file}`,
            title: trackNames[trackIndex] || path.parse(file).name,
            image: albumData.cover || `https://imanol-llona-music-files.pages.dev/albums/${album.name}/cover.jpg`,
            artists: ["Imanol Llona"],
            album: albumData.title,
            duration: await formatDuration(duration)
          });
          songId++;
          trackIndex++;
        } catch (error) {
          console.error(`Error obteniendo duración de ${file}:`, error);
        }
      }
    }

    albumData.duration = `${Math.floor(albumDuration / 60)} min ${Math.floor(albumDuration % 60)} sec`;
    data.playlists.push(albumData);
    albumId++;
  }

  fs.writeFileSync(path.join('.', 'data.json'), JSON.stringify(data, null, 2));
  console.log('data.json generado con éxito');
}

generateData();
