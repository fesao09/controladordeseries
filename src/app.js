import { db, ref, set, get, remove } from './firebase.js';
import { searchTMDb, getSeriesDetails, getSeasonDetails } from './tmdb.js';
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-btn');
const clearButton = document.getElementById('clear-btn');
const resultsGrid = document.getElementById('results-grid');
const categories = {
  "filmes-assistidos": document.getElementById('filmes-assistidos'),
  "filmes-para-assistir": document.getElementById('filmes-para-assistir'),
  "series-em-andamento": document.getElementById('series-em-andamento'),
  "series-assistidas": document.getElementById('series-assistidas'),
};

// Limpar resultados da busca
clearButton.addEventListener('click', () => {
  searchInput.value = '';
  resultsGrid.innerHTML = '';
});

// Busca no TMDb
searchButton.addEventListener('click', async () => {
  try {
    const query = searchInput.value.trim();
    if (!query) {
      alert('Digite algo para buscar!');
      return;
    }

    const results = await searchTMDb(query);
    resultsGrid.innerHTML = '';

    results.forEach(item => {
      const div = document.createElement('div');
      div.className = 'movie';
      div.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w200${item.poster_path}" alt="${item.title || item.name}">
        <h3>${item.title || item.name}</h3>
        <select id="category-select-${item.id}">
          <option value="">Selecione uma Categoria</option>
          <option value="filmes-assistidos">Filmes Assistidos</option>
          <option value="filmes-para-assistir">Filmes para Assistir</option>
          <option value="series-em-andamento">Séries em Andamento</option>
          <option value="series-assistidas">Séries Assistidas</option>
        </select>
        <button onclick="addToSelectedCategory('${item.title || item.name}', '${item.id}')">Adicionar</button>
        <button onclick="showDetails('${item.id}', '${item.media_type}', '${item.title || item.name}')">Detalhes</button>
      `;
      resultsGrid.appendChild(div);
    });
  } catch (error) {
    console.error('Erro ao buscar filmes:', error);
  }
});

// Adicionar à Categoria Selecionada
window.addToSelectedCategory = async (name, id) => {
  const categorySelect = document.getElementById(`category-select-${id}`);
  const category = categorySelect.value;

  if (!category) {
    alert("Selecione uma categoria!");
    return;
  }

  const imagePath = document.querySelector(`#category-select-${id}`).parentNode.querySelector('img').src;

  const categoryRef = ref(db, `${category}/${id}`); // Salva o ID como chave
  await set(categoryRef, {
    id, // Salva o ID
    name,
    poster_path: imagePath
  });

  loadCategory(category);
};

// Carregar Categorias
async function loadCategory(category) {
  const categoryRef = ref(db, category);
  const snapshot = await get(categoryRef);

  if (!categories[category]) {
    console.error(`Categoria "${category}" não encontrada no HTML.`);
    return;
  }

  const moviesGrid = categories[category].querySelector('.movies-grid');
  if (!moviesGrid) {
    console.error(`Elemento ".movies-grid" não encontrado em "${category}".`);
    return;
  }

  moviesGrid.innerHTML = '';
  if (snapshot.exists()) {
    const data = snapshot.val();
    Object.keys(data).forEach(key => {
      const movie = data[key]; // Dados do filme ou série
      const div = document.createElement('div');
      div.className = 'movie';
      div.innerHTML = `
        <img src="${movie.poster_path}" alt="${movie.name}">
        <h3>${movie.name}</h3>
        <button onclick="showDetails('${movie.id}', '${category.includes('series') ? 'tv' : 'movie'}', '${movie.name}')">Detalhes</button>
        <button onclick="removeFromCategory('${movie.id}', '${category}')">Excluir</button>
      `;
      moviesGrid.appendChild(div);
    });
  }
}
// Mostrar Detalhes no Pop-up
window.showDetails = async (id, type, name) => {
  const detailsPopup = document.getElementById('details-popup');
  const popupDetails = document.getElementById('popup-details');

  if (!detailsPopup || !popupDetails) {
    console.error('O modal de detalhes não foi encontrado no DOM.');
    return;
  }

  // Redefine o conteúdo do modal antes de carregá-lo
  popupDetails.innerHTML = '<p>Carregando detalhes...</p>';

  try {
    if (type === 'tv') {
      const seriesDetails = await getSeriesDetails(id);

      if (!seriesDetails || !seriesDetails.seasons || !Array.isArray(seriesDetails.seasons)) {
        alert('Detalhes da série estão incompletos ou não disponíveis.');
        return;
      }

      // Filtra para ignorar a Temporada 0 (extras)
      const validSeasons = seriesDetails.seasons.filter(season => season.season_number > 0);

      let content = `<h3>${name}</h3>`;
      content += `<p><strong>Ano de Lançamento:</strong> ${seriesDetails.first_air_date?.split('-')[0] || 'N/A'}</p>`;
      content += `<p><strong>Streaming:</strong> <a href="https://www.themoviedb.org/tv/${id}" target="_blank">Assistir no TMDb</a></p>`;
      content += `<label for="season-select"><strong>Selecionar Temporada:</strong></label>`;
      content += `<select id="season-select" onchange="displaySeasonDetails('${id}', this.value)">`;

      validSeasons.forEach(season => {
        content += `<option value="${season.season_number}">Temporada ${season.season_number}</option>`;
      });

      content += `</select>`;
      content += `<div id="season-details"></div>`;

      popupDetails.innerHTML = content;

      // Exibe a primeira temporada ou aquela com episódios pendentes
      const firstPendingSeason = await findFirstPendingSeason(id, validSeasons);
      displaySeasonDetails(id, firstPendingSeason);
    } else if (type === 'movie') {
      const movieDetails = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=5c66fecac3410a4da2709f1d944be38c`);
      const movieData = await movieDetails.json();

      if (!movieData) {
        alert(`Não foi possível carregar os detalhes do filme "${name}".`);
        return;
      }

      const content = `
        <h3>${name}</h3>
        <p><strong>Ano de Lançamento:</strong> ${movieData.release_date?.split('-')[0] || 'N/A'}</p>
        <p><strong>Duração:</strong> ${movieData.runtime || 'N/A'} minutos</p>
        <p><strong>Streaming:</strong> <a href="https://www.themoviedb.org/movie/${id}" target="_blank">Assistir no TMDb</a></p>
      `;
      popupDetails.innerHTML = content;
    } else {
      popupDetails.innerHTML = `<h3>${name}</h3><p>Detalhes não disponíveis para este tipo de mídia.</p>`;
    }

    detailsPopup.classList.remove('hidden');
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error);
    alert('Não foi possível carregar os detalhes. Tente novamente mais tarde.');
  }
};

window.markSeasonAsWatched = async (seriesId, seasonNumber, isChecked) => {
  try {
    const seasonDetails = await getSeasonDetails(seriesId, seasonNumber);

    if (!seasonDetails || !seasonDetails.episodes) {
      alert(`Não foi possível carregar os detalhes da temporada ${seasonNumber}.`);
      return;
    }

    for (const episode of seasonDetails.episodes) {
      const episodeRef = ref(db, `series/${seriesId}/season-${seasonNumber}/episode-${episode.episode_number}`);
      await set(episodeRef, isChecked);

      // Atualiza o estado do checkbox na interface
      const checkbox = document.getElementById(`episode-${seriesId}-${seasonNumber}-${episode.episode_number}`);
      if (checkbox) {
        checkbox.checked = isChecked;
      }
    }

    console.log(`Temporada ${seasonNumber} de ${seriesId} marcada como ${isChecked ? 'assistida' : 'não assistida'}.`);
  } catch (error) {
    console.error(`Erro ao marcar temporada ${seasonNumber} de ${seriesId}:`, error);
    alert('Não foi possível marcar a temporada como assistida. Tente novamente.');
  }
};
window.displaySeasonDetails = async (seriesId, seasonNumber) => {
  const seasonDetailsDiv = document.getElementById('season-details');

  try {
    const seasonDetails = await getSeasonDetails(seriesId, seasonNumber);

    if (!seasonDetails || !seasonDetails.episodes) {
      seasonDetailsDiv.innerHTML = `<p>Não foi possível carregar os detalhes da temporada ${seasonNumber}.</p>`;
      return;
    }

    let content = `
      <h4>Temporada ${seasonNumber}</h4>
      <ul>
    `;

    for (const episode of seasonDetails.episodes) {
      const episodeRef = ref(db, `series/${seriesId}/season-${seasonNumber}/episode-${episode.episode_number}`);
      const snapshot = await get(episodeRef);
      const isWatched = snapshot.exists() ? snapshot.val() : false;

      content += `
        <li>
          <label>
            <input type="checkbox" id="episode-${seriesId}-${seasonNumber}-${episode.episode_number}" 
                   onchange="updateEpisodeStatus('${seriesId}', ${seasonNumber}, ${episode.episode_number}, this.checked)"
                   ${isWatched ? 'checked' : ''}>
            ${episode.name || `Episódio ${episode.episode_number}`}
          </label>
        </li>
      `;
    }

    content += `</ul>`;
    seasonDetailsDiv.innerHTML = content;
  } catch (error) {
    console.error(`Erro ao exibir temporada ${seasonNumber} de ${seriesId}:`, error);
    seasonDetailsDiv.innerHTML = `<p>Erro ao carregar os detalhes da temporada ${seasonNumber}.</p>`;
  }
};
async function findFirstPendingSeason(seriesId, seasons) {
  for (const season of seasons) {
    const seasonRef = ref(db, `series/${seriesId}/season-${season.season_number}`);
    const snapshot = await get(seasonRef);

    if (snapshot.exists()) {
      const episodes = snapshot.val();
      const hasPending = Object.values(episodes).some(isWatched => !isWatched);

      if (hasPending) {
        return season.season_number;
      }
    }
  }

  // Retorna a primeira temporada caso todas estejam assistidas
  return seasons[0].season_number;
}

// Fechar Pop-up
window.closeDetailsModal = () => {
  const detailsPopup = document.getElementById('details-popup');
  const popupDetails = document.getElementById('popup-details');

  if (detailsPopup) {
    detailsPopup.classList.add('hidden');
  }

  if (popupDetails) {
    popupDetails.innerHTML = ''; // Limpa o conteúdo ao fechar
  }
};

// Remover Item da Categoria
window.removeFromCategory = async (id, category) => {
  if (!id || !category) {
    console.error('ID ou categoria indefinida ao tentar remover item.');
    alert('Não foi possível remover o item. Tente novamente.');
    return;
  }

  try {
    const categoryRef = ref(db, `${category}/${id}`);
    await remove(categoryRef);
    loadCategory(category); // Recarrega a categoria após a exclusão
    console.log(`Item com ID ${id} removido da categoria ${category}.`);
  } catch (error) {
    console.error(`Erro ao remover item com ID ${id} da categoria ${category}:`, error);
    alert('Não foi possível remover o item. Tente novamente.');
  }
};


// Carregar Todas as Categorias ao Iniciar
Object.keys(categories).forEach(loadCategory);



